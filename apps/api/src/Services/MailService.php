<?php

declare(strict_types=1);

namespace kodanAPPS\Services;

use kodanAPPS\DB\TenantAwarePDO;
use kodanAPPS\DB\TenantContext;
use kodanAPPS\Repositories\SmtpConfigRepository;
use RuntimeException;
use PDO;
use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception as PHPMailerException;

final class MailService
{
    private TenantAwarePDO $pdo;
    private SmtpConfigRepository $smtpConfigRepo;

    /** AES-256-CBC cipher method */
    private const CIPHER = 'aes-256-cbc';

    public function __construct(TenantAwarePDO $pdo, SmtpConfigRepository $smtpConfigRepo)
    {
        $this->pdo = $pdo;
        $this->smtpConfigRepo = $smtpConfigRepo;
    }

    /**
     * Envía un correo electrónico y lo registra en el historial unificado de mensajería
     * 
     * @param array<string, mixed> $data
     * @return array{success: bool, message_id: int}
     */
    public function sendAndLog(array $data): array
    {
        $to = isset($data['to']) ? trim((string)$data['to']) : '';
        $subject = isset($data['subject']) ? trim((string)$data['subject']) : '';
        $body = isset($data['body']) ? (string)$data['body'] : '';
        
        $entityType = isset($data['entity_type']) && !empty($data['entity_type']) ? trim((string)$data['entity_type']) : null;
        $entityId = isset($data['entity_id']) && (int)$data['entity_id'] > 0 ? (int)$data['entity_id'] : null;

        if ($to === '' || !filter_var($to, FILTER_VALIDATE_EMAIL)) {
            throw new \InvalidArgumentException('El correo del destinatario no es válido.');
        }
        if ($subject === '') {
            throw new \InvalidArgumentException('El asunto del correo es requerido.');
        }
        if ($body === '') {
            throw new \InvalidArgumentException('El cuerpo del correo no puede estar vacío.');
        }

        $tenantId = TenantContext::getTenantId();
        $senderId = TenantContext::getUserId();

        // 1. Resolver configuración SMTP (tenant → fallback global)
        $smtpConfig = $this->resolveSmtpConfig();

        if ($smtpConfig['host'] !== '') {
            $this->sendViaPHPMailer($to, $subject, $body, $smtpConfig);
        } else {
            $this->simulateMailTransport($to, $subject, $body, $tenantId);
        }

        // 2. Transacción de Base de Datos para el Historial Unificado
        $this->pdo->beginTransaction();
        try {
            $conversationId = 0;

            // Determinar o crear conversación
            if ($entityType !== null && $entityId !== null) {
                $stmtConv = $this->pdo->prepare(
                    "SELECT id FROM conversations 
                     WHERE tenant_id = :tid AND entity_type = :etype AND entity_id = :eid 
                     LIMIT 1"
                );
                $stmtConv->execute([
                    ':tid' => $tenantId,
                    ':etype' => $entityType,
                    ':eid' => $entityId
                ]);
                $convRow = $stmtConv->fetch();

                if ($convRow) {
                    $conversationId = (int)$convRow['id'];
                } else {
                    $stmtCreateConv = $this->pdo->prepare(
                        "INSERT INTO conversations (tenant_id, type, entity_type, entity_id) 
                         VALUES (:tid, 'entity', :etype, :eid)"
                    );
                    $stmtCreateConv->execute([
                        ':tid' => $tenantId,
                        ':etype' => $entityType,
                        ':eid' => $entityId
                    ]);
                    $conversationId = (int)$this->pdo->lastInsertId();

                    $stmtSubscribe = $this->pdo->prepare(
                        "INSERT IGNORE INTO conversation_participants (conversation_id, user_id) 
                         VALUES (:cid, :uid)"
                    );
                    $stmtSubscribe->execute([
                        ':cid' => $conversationId,
                        ':uid' => $senderId
                    ]);
                }
            } else {
                $stmtGeneralConv = $this->pdo->prepare(
                    "SELECT id FROM conversations 
                     WHERE tenant_id = :tid AND type = 'direct' AND entity_type IS NULL 
                     LIMIT 1"
                );
                $stmtGeneralConv->execute([':tid' => $tenantId]);
                $convRow = $stmtGeneralConv->fetch();

                if ($convRow) {
                    $conversationId = (int)$convRow['id'];
                } else {
                    $stmtCreateConv = $this->pdo->prepare(
                        "INSERT INTO conversations (tenant_id, type, entity_type, entity_id) 
                         VALUES (:tid, 'direct', NULL, NULL)"
                    );
                    $stmtCreateConv->execute([':tid' => $tenantId]);
                    $conversationId = (int)$this->pdo->lastInsertId();

                    $stmtSubscribe = $this->pdo->prepare(
                        "INSERT IGNORE INTO conversation_participants (conversation_id, user_id) 
                         VALUES (:cid, :uid)"
                    );
                    $stmtSubscribe->execute([
                        ':cid' => $conversationId,
                        ':uid' => $senderId
                    ]);
                }
            }

            // Registrar en la tabla de messages centralizada
            $metadata = json_encode([
                'channel' => 'email',
                'subject' => $subject,
                'to' => $to,
                'sent_at' => date('Y-m-d H:i:s')
            ]);

            $stmtMsg = $this->pdo->prepare(
                "INSERT INTO messages (tenant_id, conversation_id, sender_id, content, is_system, system_metadata, created_at)
                 VALUES (:tid, :cid, :sid, :content, 0, :meta, NOW())"
            );
            $stmtMsg->execute([
                ':tid' => $tenantId,
                ':cid' => $conversationId,
                ':sid' => $senderId,
                ':content' => $body,
                ':meta' => $metadata
            ]);
            $newMsgId = (int)$this->pdo->lastInsertId();

            $this->pdo->commit();

            return [
                'success' => true,
                'message_id' => $newMsgId
            ];

        } catch (\Throwable $e) {
            $this->pdo->rollBack();
            throw new RuntimeException('Error al registrar el envío de correo en la base de datos: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Prueba la conexión SMTP con credenciales proporcionadas (sin persistir)
     * 
     * @param array<string, mixed> $config
     * @return array{success: bool, message: string}
     */
    public function testSmtpConnection(array $config): array
    {
        $host = trim((string)($config['smtp_host'] ?? ''));
        $port = (int)($config['smtp_port'] ?? 587);
        $user = trim((string)($config['smtp_user'] ?? ''));
        $pass = trim((string)($config['smtp_pass'] ?? ''));
        $secure = strtolower(trim((string)($config['smtp_secure'] ?? 'tls')));
        $fromEmail = trim((string)($config['from_email'] ?? ''));
        $fromName = trim((string)($config['from_name'] ?? ''));

        if ($host === '') {
            return ['success' => false, 'message' => 'El host SMTP es requerido.'];
        }
        if ($user === '') {
            return ['success' => false, 'message' => 'El usuario SMTP es requerido.'];
        }
        if ($fromEmail === '') {
            return ['success' => false, 'message' => 'El email remitente es requerido.'];
        }

        $mail = new PHPMailer(true);
        try {
            $mail->isSMTP();
            $mail->Host = $host;
            $mail->SMTPAuth = true;
            $mail->Username = $user;
            $mail->Password = $pass;

            if ($secure === 'ssl') {
                $mail->SMTPSecure = PHPMailer::ENCRYPTION_SMTPS;
            } elseif ($secure === 'none') {
                $mail->SMTPSecure = '';
                $mail->SMTPAutoTLS = false;
            } else {
                $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
            }

            $mail->Port = $port;
            $mail->CharSet = 'UTF-8';
            $mail->Timeout = 10;

            $mail->setFrom($fromEmail, $fromName !== '' ? $fromName : 'kodanAPPS Test');
            $mail->addAddress($fromEmail);

            $mail->isHTML(true);
            $mail->Subject = 'kodanAPPS - Test de Conexión SMTP';
            $mail->Body = '<p>✅ Este es un correo de prueba desde <strong>kodanAPPS</strong>. Tu configuración SMTP funciona correctamente.</p>';
            $mail->AltBody = 'kodanAPPS - Test de Conexión SMTP exitoso.';

            $mail->send();

            return ['success' => true, 'message' => 'Conexión SMTP exitosa. Se envió un correo de prueba a ' . $fromEmail . '.'];
        } catch (\Throwable $e) {
            return ['success' => false, 'message' => 'Error SMTP: ' . $mail->ErrorInfo . ' | ' . $e->getMessage()];
        }
    }

    // ========================================================================
    // SMTP Resolution: Tenant → Fallback Global
    // ========================================================================

    /**
     * Resuelve la configuración SMTP: primero busca config del tenant,
     * si no existe o está inactiva, fallback a variables de entorno globales.
     * 
     * @return array{host: string, port: int, user: string, pass: string, secure: string, from_email: string, from_name: string, source: string}
     */
    private function resolveSmtpConfig(): array
    {
        // Intentar config del tenant
        $tenantConfig = $this->smtpConfigRepo->getConfig();

        if ($tenantConfig !== null && (int)($tenantConfig['is_active'] ?? 0) === 1) {
            $decryptedPass = $this->decryptPassword((string)($tenantConfig['smtp_pass_encrypted'] ?? ''));

            return [
                'host' => (string)($tenantConfig['smtp_host'] ?? ''),
                'port' => (int)($tenantConfig['smtp_port'] ?? 587),
                'user' => (string)($tenantConfig['smtp_user'] ?? ''),
                'pass' => $decryptedPass,
                'secure' => (string)($tenantConfig['smtp_secure'] ?? 'tls'),
                'from_email' => (string)($tenantConfig['from_email'] ?? ''),
                'from_name' => (string)($tenantConfig['from_name'] ?? ''),
                'source' => 'tenant',
            ];
        }

        // Fallback: variables de entorno globales
        return [
            'host' => $this->getEnvString('SMTP_HOST'),
            'port' => $this->getEnvInt('SMTP_PORT', 587),
            'user' => $this->getEnvString('SMTP_USER'),
            'pass' => $this->getEnvString('SMTP_PASS'),
            'secure' => $this->getEnvString('SMTP_SECURE', 'tls'),
            'from_email' => $this->getEnvString('SMTP_FROM_EMAIL', 'no-reply@kodan.software'),
            'from_name' => $this->getEnvString('SMTP_FROM_NAME', 'kodanAPPS'),
            'source' => 'global',
        ];
    }

    // ========================================================================
    // Encryption helpers (AES-256-CBC)
    // ========================================================================

    /**
     * Encripta un password SMTP con AES-256-CBC
     */
    public function encryptPassword(string $plainPassword): string
    {
        $key = $this->getEncryptionKey();
        $ivLen = (int)openssl_cipher_iv_length(self::CIPHER);
        if ($ivLen <= 0) {
            throw new RuntimeException('No se pudo determinar el tamaño del IV para el cifrado.');
        }
        $iv = openssl_random_pseudo_bytes($ivLen);
        $encrypted = openssl_encrypt($plainPassword, self::CIPHER, $key, OPENSSL_RAW_DATA, $iv);
        if ($encrypted === false) {
            throw new RuntimeException('Error al encriptar el password SMTP.');
        }
        // Almacenamos iv + ciphertext en base64
        return base64_encode($iv . $encrypted);
    }

    /**
     * Desencripta un password SMTP almacenado
     */
    private function decryptPassword(string $encryptedPassword): string
    {
        if ($encryptedPassword === '') {
            return '';
        }

        $key = $this->getEncryptionKey();
        $data = base64_decode($encryptedPassword, true);
        if ($data === false) {
            return '';
        }

        $ivLen = (int)openssl_cipher_iv_length(self::CIPHER);
        if ($ivLen <= 0 || strlen($data) < $ivLen) {
            return '';
        }

        $iv = substr($data, 0, $ivLen);
        $ciphertext = substr($data, $ivLen);
        $decrypted = openssl_decrypt($ciphertext, self::CIPHER, $key, OPENSSL_RAW_DATA, $iv);

        return is_string($decrypted) ? $decrypted : '';
    }

    /**
     * Obtiene la clave maestra de encriptación del entorno
     */
    private function getEncryptionKey(): string
    {
        $key = $this->getEnvString('APP_ENCRYPTION_KEY');
        if ($key === '') {
            // Fallback determinístico para desarrollo (NO usar en producción sin configurar)
            $key = 'kodan-apps-default-encryption-key-change-me';
        }
        return hash('sha256', $key, true);
    }

    // ========================================================================
    // Transport methods
    // ========================================================================

    /**
     * Simulación local del envío de email
     */
    private function simulateMailTransport(string $to, string $subject, string $body, int $tenantId): void
    {
        $logPath = __DIR__ . '/../../tmp/mail_transport_sim.log';
        if (!is_dir(dirname($logPath))) {
            @mkdir(dirname($logPath), 0777, true);
        }
        
        $timestamp = date('Y-m-d H:i:s');
        $logContent = "------------------------------------------------------------\n";
        $logContent .= "TIMESTAMP: {$timestamp} | TENANT_ID: {$tenantId}\n";
        $logContent .= "TO: {$to}\n";
        $logContent .= "SUBJECT: {$subject}\n";
        $logContent .= "BODY:\n{$body}\n";
        $logContent .= "------------------------------------------------------------\n\n";
        
        @file_put_contents($logPath, $logContent, FILE_APPEND);
    }

    /**
     * Envía el correo utilizando PHPMailer y configuración SMTP resuelta
     * 
     * @param array{host: string, port: int, user: string, pass: string, secure: string, from_email: string, from_name: string, source: string} $config
     */
    private function sendViaPHPMailer(string $to, string $subject, string $body, array $config): void
    {
        $mail = new PHPMailer(true);
        try {
            $mail->isSMTP();
            $mail->Host = $config['host'];
            $mail->SMTPAuth = true;
            $mail->Username = $config['user'];
            $mail->Password = $config['pass'];
            
            $secure = strtolower($config['secure']);
            if ($secure === 'ssl') {
                $mail->SMTPSecure = PHPMailer::ENCRYPTION_SMTPS;
            } elseif ($secure === 'none') {
                $mail->SMTPSecure = '';
                $mail->SMTPAutoTLS = false;
            } else {
                $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
            }
            
            $mail->Port = $config['port'];
            $mail->CharSet = 'UTF-8';

            $mail->setFrom($config['from_email'], $config['from_name']);
            $mail->addAddress($to);

            $mail->isHTML(true);
            $mail->Subject = $subject;
            $mail->Body    = $body;
            $mail->AltBody = strip_tags($body);

            $mail->send();
        } catch (\Throwable $e) {
            throw new RuntimeException('Error de envío SMTP: ' . $mail->ErrorInfo . ' | Detalle: ' . $e->getMessage(), 500);
        }
    }

    // ========================================================================
    // Env helpers
    // ========================================================================

    /**
     * Obtiene una variable de entorno de forma segura
     */
    private function getEnvString(string $key, string $default = ''): string
    {
        if (isset($_ENV[$key]) && is_string($_ENV[$key])) {
            return $_ENV[$key];
        }
        if (isset($_SERVER[$key]) && is_string($_SERVER[$key])) {
            return $_SERVER[$key];
        }
        $val = getenv($key);
        return is_string($val) ? $val : $default;
    }

    /**
     * Obtiene una variable de entorno entera de forma segura
     */
    private function getEnvInt(string $key, int $default = 0): int
    {
        $val = $this->getEnvString($key, '');
        return $val !== '' ? (int)$val : $default;
    }
}

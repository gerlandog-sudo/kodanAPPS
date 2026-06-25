<?php

declare(strict_types=1);

namespace kodanAPPS\Controllers;

use kodanAPPS\Repositories\EmailTemplateRepository;
use kodanAPPS\Repositories\SmtpConfigRepository;
use kodanAPPS\Services\MailService;
use InvalidArgumentException;
use RuntimeException;

final class MailController
{
    private EmailTemplateRepository $templateRepo;
    private SmtpConfigRepository $smtpConfigRepo;
    private MailService $mailService;

    public function __construct(
        EmailTemplateRepository $templateRepo,
        SmtpConfigRepository $smtpConfigRepo,
        MailService $mailService
    ) {
        $this->templateRepo = $templateRepo;
        $this->smtpConfigRepo = $smtpConfigRepo;
        $this->mailService = $mailService;
    }

    // ========================================================================
    // Email Templates CRUD
    // ========================================================================

    /**
     * GET /api/mail/templates
     * 
     * @return array<int, array<string, mixed>>
     */
    public function listTemplates(): array
    {
        $module = isset($_GET['module']) ? trim((string)$_GET['module']) : null;
        return $this->templateRepo->getTemplatesByModule($module);
    }

    /**
     * GET /api/mail/templates/{id}
     * 
     * @param array{id: int} $p
     * @return array<string, mixed>
     */
    public function getTemplate(array $p): array
    {
        $template = $this->templateRepo->findById($p['id']);
        if (!$template) {
            throw new RuntimeException('Plantilla no encontrada.', 404);
        }
        return $template;
    }

    /**
     * POST /api/mail/templates
     * 
     * @param array<string, mixed> $input
     * @return array{success: bool, id: int, message: string}
     */
    public function createTemplate(array $input): array
    {
        $name = isset($input['name']) ? trim((string)$input['name']) : '';
        $subject = isset($input['subject']) ? trim((string)$input['subject']) : '';
        $body = isset($input['body']) ? trim((string)$input['body']) : '';

        if ($name === '') {
            throw new InvalidArgumentException('El nombre de la plantilla es requerido.');
        }
        if ($subject === '') {
            throw new InvalidArgumentException('El asunto por defecto es requerido.');
        }
        if ($body === '') {
            throw new InvalidArgumentException('El cuerpo de la plantilla es requerido.');
        }

        $newId = $this->templateRepo->createTemplate($input);

        return [
            'success' => true,
            'id' => $newId,
            'message' => 'Plantilla de correo creada exitosamente.'
        ];
    }

    /**
     * PATCH /api/mail/templates/{id}
     * 
     * @param array{id: int} $p
     * @param array<string, mixed> $input
     * @return array{success: bool, message: string}
     */
    public function updateTemplate(array $p, array $input): array
    {
        $template = $this->templateRepo->findById($p['id']);
        if (!$template) {
            throw new RuntimeException('Plantilla no encontrada.', 404);
        }

        $this->templateRepo->updateTemplate($p['id'], $input);

        return [
            'success' => true,
            'message' => 'Plantilla de correo actualizada exitosamente.'
        ];
    }

    /**
     * DELETE /api/mail/templates/{id}
     * 
     * @param array{id: int} $p
     * @return array{success: bool, message: string}
     */
    public function deleteTemplate(array $p): array
    {
        $template = $this->templateRepo->findById($p['id']);
        if (!$template) {
            throw new RuntimeException('Plantilla no encontrada.', 404);
        }

        $this->templateRepo->deleteTemplate($p['id']);

        return [
            'success' => true,
            'message' => 'Plantilla de correo eliminada exitosamente.'
        ];
    }

    /**
     * POST /api/mail/send
     * 
     * @param array<string, mixed> $input
     * @return array{success: bool, message_id: int, message: string}
     */
    public function sendMail(array $input): array
    {
        $result = $this->mailService->sendAndLog($input);

        return [
            'success' => true,
            'message_id' => $result['message_id'],
            'message' => 'Correo electrónico enviado y registrado exitosamente.'
        ];
    }

    // ========================================================================
    // SMTP Configuration per Tenant
    // ========================================================================

    /**
     * GET /api/mail/smtp-config
     * Retorna la configuración SMTP del tenant (sin password en texto plano)
     * 
     * @return array<string, mixed>
     */
    public function getSmtpConfig(): array
    {
        $config = $this->smtpConfigRepo->getConfig();

        if ($config === null) {
            return [
                'configured' => false,
                'source' => 'global',
                'message' => 'Este tenant no tiene configuración SMTP propia. Se utiliza la configuración global del sistema.',
            ];
        }

        return [
            'configured' => true,
            'source' => 'tenant',
            'smtp_host' => $config['smtp_host'] ?? '',
            'smtp_port' => (int)($config['smtp_port'] ?? 587),
            'smtp_user' => $config['smtp_user'] ?? '',
            'has_password' => ($config['smtp_pass_encrypted'] ?? '') !== '',
            'smtp_secure' => $config['smtp_secure'] ?? 'tls',
            'from_email' => $config['from_email'] ?? '',
            'from_name' => $config['from_name'] ?? '',
            'is_active' => (int)($config['is_active'] ?? 1),
            'updated_at' => $config['updated_at'] ?? $config['created_at'] ?? null,
        ];
    }

    /**
     * PUT /api/mail/smtp-config
     * Guarda o actualiza la configuración SMTP del tenant
     * 
     * @param array<string, mixed> $input
     * @return array{success: bool, message: string}
     */
    public function saveSmtpConfig(array $input): array
    {
        $host = isset($input['smtp_host']) ? trim((string)$input['smtp_host']) : '';
        $port = (int)($input['smtp_port'] ?? 587);
        $user = isset($input['smtp_user']) ? trim((string)$input['smtp_user']) : '';
        $pass = isset($input['smtp_pass']) ? (string)$input['smtp_pass'] : '';
        $secure = isset($input['smtp_secure']) ? strtolower(trim((string)$input['smtp_secure'])) : 'tls';
        $fromEmail = isset($input['from_email']) ? trim((string)$input['from_email']) : '';
        $fromName = isset($input['from_name']) ? trim((string)$input['from_name']) : '';
        $isActive = isset($input['is_active']) ? (int)$input['is_active'] : 1;

        if ($host === '') {
            throw new InvalidArgumentException('El host SMTP es requerido.');
        }
        if ($user === '') {
            throw new InvalidArgumentException('El usuario SMTP es requerido.');
        }
        if ($fromEmail === '' || !filter_var($fromEmail, FILTER_VALIDATE_EMAIL)) {
            throw new InvalidArgumentException('El email remitente no es válido.');
        }
        if (!in_array($secure, ['tls', 'ssl', 'none'], true)) {
            $secure = 'tls';
        }

        $data = [
            'smtp_host' => $host,
            'smtp_port' => $port,
            'smtp_user' => $user,
            'smtp_secure' => $secure,
            'from_email' => $fromEmail,
            'from_name' => $fromName,
            'is_active' => $isActive,
        ];

        // Si se envió password, encriptar. Si viene vacío y ya hay config, preservar el existente.
        if ($pass !== '') {
            $data['smtp_pass_encrypted'] = $this->mailService->encryptPassword($pass);
        } else {
            $existing = $this->smtpConfigRepo->getConfig();
            if ($existing !== null) {
                $data['smtp_pass_encrypted'] = $existing['smtp_pass_encrypted'];
            } else {
                throw new InvalidArgumentException('La contraseña SMTP es requerida para la primera configuración.');
            }
        }

        $this->smtpConfigRepo->upsertConfig($data);

        return [
            'success' => true,
            'message' => 'Configuración SMTP guardada exitosamente.',
        ];
    }

    /**
     * POST /api/mail/smtp-config/test
     * Prueba la conexión SMTP con las credenciales proporcionadas
     * 
     * @param array<string, mixed> $input
     * @return array{success: bool, message: string}
     */
    public function testSmtpConfig(array $input): array
    {
        $pass = isset($input['smtp_pass']) ? (string)$input['smtp_pass'] : '';

        // Si no se envió password, intentar usar el almacenado
        if ($pass === '') {
            $existing = $this->smtpConfigRepo->getConfig();
            if ($existing !== null && ($existing['smtp_pass_encrypted'] ?? '') !== '') {
                // Necesitamos desencriptar → reusar la lógica del servicio
                // El test requiere password en plano, así que lo extraemos
                $input['smtp_pass'] = '***stored***';
                // En este caso delegamos al servicio que tiene acceso a desencriptar
                // Mejor: construir la config completa y usar test directo
                return $this->mailService->testSmtpConnection([
                    'smtp_host' => $input['smtp_host'] ?? $existing['smtp_host'] ?? '',
                    'smtp_port' => $input['smtp_port'] ?? $existing['smtp_port'] ?? 587,
                    'smtp_user' => $input['smtp_user'] ?? $existing['smtp_user'] ?? '',
                    'smtp_pass' => $this->decryptStoredPassword((string)($existing['smtp_pass_encrypted'] ?? '')),
                    'smtp_secure' => $input['smtp_secure'] ?? $existing['smtp_secure'] ?? 'tls',
                    'from_email' => $input['from_email'] ?? $existing['from_email'] ?? '',
                    'from_name' => $input['from_name'] ?? $existing['from_name'] ?? '',
                ]);
            }
            return ['success' => false, 'message' => 'Se requiere una contraseña SMTP para la prueba.'];
        }

        return $this->mailService->testSmtpConnection($input);
    }

    /**
     * DELETE /api/mail/smtp-config
     * Elimina la configuración SMTP del tenant (vuelve al fallback global)
     * 
     * @return array{success: bool, message: string}
     */
    public function deleteSmtpConfig(): array
    {
        $existing = $this->smtpConfigRepo->getConfig();
        if ($existing === null) {
            return [
                'success' => false,
                'message' => 'No hay configuración SMTP personalizada para eliminar.',
            ];
        }

        $this->smtpConfigRepo->deleteConfig();

        return [
            'success' => true,
            'message' => 'Configuración SMTP eliminada. Se utilizará la configuración global del sistema.',
        ];
    }

    /**
     * Helper para desencriptar password almacenado (reutiliza lógica del servicio)
     */
    private function decryptStoredPassword(string $encrypted): string
    {
        if ($encrypted === '') {
            return '';
        }

        $key = $this->getEncryptionKey();
        $data = base64_decode($encrypted, true);
        if ($data === false) {
            return '';
        }

        $ivLen = (int)openssl_cipher_iv_length('aes-256-cbc');
        if ($ivLen <= 0 || strlen($data) < $ivLen) {
            return '';
        }

        $iv = substr($data, 0, $ivLen);
        $ciphertext = substr($data, $ivLen);
        $decrypted = openssl_decrypt($ciphertext, 'aes-256-cbc', $key, OPENSSL_RAW_DATA, $iv);

        return is_string($decrypted) ? $decrypted : '';
    }

    /**
     * Obtiene la clave de encriptación del entorno
     */
    private function getEncryptionKey(): string
    {
        $key = '';
        if (isset($_ENV['APP_ENCRYPTION_KEY']) && is_string($_ENV['APP_ENCRYPTION_KEY'])) {
            $key = $_ENV['APP_ENCRYPTION_KEY'];
        } elseif (isset($_SERVER['APP_ENCRYPTION_KEY']) && is_string($_SERVER['APP_ENCRYPTION_KEY'])) {
            $key = $_SERVER['APP_ENCRYPTION_KEY'];
        } else {
            $val = getenv('APP_ENCRYPTION_KEY');
            $key = is_string($val) ? $val : '';
        }
        if ($key === '') {
            $key = 'kodan-apps-default-encryption-key-change-me';
        }
        return hash('sha256', $key, true);
    }
}

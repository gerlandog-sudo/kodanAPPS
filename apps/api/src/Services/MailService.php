<?php

declare(strict_types=1);

namespace kodanAPPS\Services;

use kodanAPPS\DB\TenantAwarePDO;
use kodanAPPS\DB\TenantContext;
use RuntimeException;
use PDO;

final class MailService
{
    private TenantAwarePDO $pdo;

    public function __construct(TenantAwarePDO $pdo)
    {
        $this->pdo = $pdo;
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

        // 1. Simulación de Envío (PHPMailer Mock)
        // En un entorno de producción real, aquí se inicializa PHPMailer o AWS SES Client
        // recuperando credenciales SMTP/SES de la tabla de configuraciones del tenant.
        $this->simulateMailTransport($to, $subject, $body, $tenantId);

        // 2. Transacción de Base de Datos para el Historial Unificado
        $this->pdo->beginTransaction();
        try {
            $conversationId = 0;

            // Determinar o crear conversación
            if ($entityType !== null && $entityId !== null) {
                // Buscar conversación de entidad existente
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
                    // Crear nueva conversación de entidad
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

                    // Suscribir automáticamente al creador (sender) a esta conversación
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
                // Caso general: Si no hay entidad ligada, se busca o crea una conversación direct o general
                // Para mantener la simplicidad y robustez, creamos una conversación transversal de tipo direct
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
}

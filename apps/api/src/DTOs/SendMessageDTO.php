<?php

declare(strict_types=1);

namespace kodanAPPS\DTOs;

use InvalidArgumentException;

/**
 * DTO inmutable para validar el payload de envío de mensajes.
 */
final readonly class SendMessageDTO
{
    public int $conversationId;
    public ?int $senderId;
    public string $content;
    public bool $isSystem;
    /** @var array<string, mixed>|null */
    public ?array $systemMetadata;

    /**
     * @param array{
     *     conversation_id: int,
     *     sender_id?: int|null,
     *     content: string,
     *     is_system?: bool|int,
     *     system_metadata?: array<string, mixed>|null
     * } $data
     * 
     * @throws InvalidArgumentException Si la validación falla
     */
    public function __construct(array $data)
    {
        $this->validate($data);

        $this->conversationId = (int)$data['conversation_id'];
        $this->senderId = isset($data['sender_id']) ? (int)$data['sender_id'] : null;
        $this->content = trim((string)$data['content']);
        $this->isSystem = !empty($data['is_system']);
        $this->systemMetadata = $data['system_metadata'] ?? null;
    }

    /**
     * Validación estricta del mensaje
     * 
     * @param array<string, mixed> $data
     * @throws InvalidArgumentException Con mensajes estructurados
     */
    private function validate(array $data): void
    {
        $errors = [];

        // conversation_id: requerido, entero positivo
        if (!isset($data['conversation_id']) || !is_numeric($data['conversation_id'])) {
            $errors['conversation_id'] = 'El ID de conversación es requerido';
        } elseif ((int)$data['conversation_id'] <= 0) {
            $errors['conversation_id'] = 'ID de conversación inválido';
        }

        // sender_id: opcional, entero positivo
        if (isset($data['sender_id'])) {
            if (!is_numeric($data['sender_id']) || (int)$data['sender_id'] <= 0) {
                $errors['sender_id'] = 'ID de remitente inválido';
            }
        }

        // content: requerido, no vacío
        if (!isset($data['content']) || !is_string($data['content'])) {
            $errors['content'] = 'El contenido del mensaje es requerido';
        } elseif (trim($data['content']) === '') {
            $errors['content'] = 'El mensaje no puede estar vacío';
        }

        if (!empty($errors)) {
            throw new InvalidArgumentException((string)json_encode($errors, JSON_UNESCAPED_UNICODE));
        }
    }

    /**
     * Convierte el DTO a array para persistencia
     * 
     * @return array<string, mixed>
     */
    public function toArray(): array
    {
        return [
            'conversation_id' => $this->conversationId,
            'sender_id' => $this->senderId,
            'content' => $this->content,
            'is_system' => $this->isSystem ? 1 : 0,
            'system_metadata' => $this->systemMetadata !== null ? json_encode($this->systemMetadata, JSON_UNESCAPED_UNICODE) : null,
        ];
    }
}

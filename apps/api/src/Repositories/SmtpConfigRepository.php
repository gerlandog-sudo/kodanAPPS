<?php

declare(strict_types=1);

namespace kodanAPPS\Repositories;

use kodanAPPS\DB\TenantAwarePDO;
use kodanAPPS\DB\TenantContext;

/**
 * SmtpConfigRepository - CRUD de configuración SMTP por tenant
 * 
 * Una sola fila por tenant (UNIQUE constraint en tenant_id).
 * Hereda tenant scope automático de BaseRepository.
 * 
 * @extends BaseRepository<array{id: int, tenant_id: int, smtp_host: string, smtp_port: int, smtp_user: string, smtp_pass_encrypted: string, smtp_secure: string, from_email: string, from_name: string, is_active: int, created_at: string, updated_at: string|null}>
 */
final class SmtpConfigRepository extends BaseRepository
{
    protected const TABLE = 'tenant_smtp_config';

    public function __construct(TenantAwarePDO $pdo)
    {
        parent::__construct($pdo);
    }

    /**
     * Obtiene la configuración SMTP del tenant actual
     * 
     * @return array<string, mixed>|null
     */
    public function getConfig(): ?array
    {
        return $this->findOne(static::TABLE, '1=1');
    }

    /**
     * Inserta o actualiza la configuración SMTP del tenant
     * 
     * @param array<string, mixed> $data
     * @return int ID del registro
     */
    public function upsertConfig(array $data): int
    {
        $existing = $this->getConfig();

        if ($existing !== null) {
            $updateData = [];
            $updatableFields = ['smtp_host', 'smtp_port', 'smtp_user', 'smtp_pass_encrypted', 'smtp_secure', 'from_email', 'from_name', 'is_active'];
            foreach ($updatableFields as $field) {
                if (array_key_exists($field, $data)) {
                    $updateData[$field] = $data[$field];
                }
            }

            if (!empty($updateData)) {
                $this->update(static::TABLE, $updateData, 'id = :id', [':id' => $existing['id']]);
            }

            return (int)$existing['id'];
        }

        return $this->create(static::TABLE, [
            'smtp_host' => trim((string)($data['smtp_host'] ?? '')),
            'smtp_port' => (int)($data['smtp_port'] ?? 587),
            'smtp_user' => trim((string)($data['smtp_user'] ?? '')),
            'smtp_pass_encrypted' => (string)($data['smtp_pass_encrypted'] ?? ''),
            'smtp_secure' => in_array($data['smtp_secure'] ?? 'tls', ['tls', 'ssl', 'none'], true) ? (string)$data['smtp_secure'] : 'tls',
            'from_email' => trim((string)($data['from_email'] ?? '')),
            'from_name' => trim((string)($data['from_name'] ?? '')),
            'is_active' => isset($data['is_active']) ? (int)$data['is_active'] : 1,
        ]);
    }

    /**
     * Elimina la configuración SMTP del tenant actual (vuelve a fallback global)
     * 
     * @return int Filas afectadas
     */
    public function deleteConfig(): int
    {
        return $this->delete(static::TABLE, '1=1');
    }
}

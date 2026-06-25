<?php

declare(strict_types=1);

namespace kodanAPPS\Repositories;

use kodanAPPS\DB\TenantAwarePDO;

/**
 * EmailTemplateRepository - CRUD de plantillas de correo con scoping de tenant automático
 * 
 * @extends BaseRepository<array{id: int, tenant_id: int, name: string, subject: string, body: string, module: string|null, created_at: string, updated_at: string|null}>
 */
final class EmailTemplateRepository extends BaseRepository
{
    protected const TABLE = 'email_templates';

    protected function getLimitConfig(): ?array
    {
        return null;
    }

    public function __construct(TenantAwarePDO $pdo)
    {
        parent::__construct($pdo);
    }

    /**
     * Crea una plantilla de correo
     * 
     * @param array<string, mixed> $data
     * @return int ID de la nueva plantilla
     */
    public function createTemplate(array $data): int
    {
        return $this->create(static::TABLE, [
            'name' => trim((string)($data['name'] ?? '')),
            'subject' => trim((string)($data['subject'] ?? '')),
            'body' => (string)($data['body'] ?? ''),
            'module' => !empty($data['module']) ? trim((string)$data['module']) : null,
        ]);
    }

    /**
     * Actualiza una plantilla
     * 
     * @param array<string, mixed> $data
     * @return int Filas afectadas
     */
    public function updateTemplate(int $id, array $data): int
    {
        $updateData = [];
        if (isset($data['name'])) {
            $updateData['name'] = trim((string)$data['name']);
        }
        if (isset($data['subject'])) {
            $updateData['subject'] = trim((string)$data['subject']);
        }
        if (isset($data['body'])) {
            $updateData['body'] = (string)$data['body'];
        }
        if (array_key_exists('module', $data)) {
            $updateData['module'] = !empty($data['module']) ? trim((string)$data['module']) : null;
        }

        if (empty($updateData)) {
            return 0;
        }

        return $this->update(static::TABLE, $updateData, 'id = :id', [':id' => $id]);
    }

    /**
     * Elimina una plantilla
     */
    public function deleteTemplate(int $id): int
    {
        return $this->delete(static::TABLE, 'id = :id', [':id' => $id]);
    }

    /**
     * Obtiene las plantillas de correo filtradas por módulo
     * 
     * @return array<int, array<string, mixed>>
     */
    public function getTemplatesByModule(?string $module): array
    {
        if ($module !== null && $module !== '') {
            return $this->findAll(
                static::TABLE, 
                '*', 
                "(module = :module OR module IS NULL OR module = 'general' OR module = '')", 
                [':module' => $module], 
                'name ASC'
            );
        }
        return $this->findAll(static::TABLE, '*', '', [], 'name ASC');
    }
}

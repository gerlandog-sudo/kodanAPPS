<?php

declare(strict_types=1);

namespace kodanAPPS\Repositories;

/**
 * PipelineRepository - Gestión de Pipelines y Etapas comerciales
 */
final class PipelineRepository extends BaseRepository
{
    /**
     * Lista todos los pipelines del tenant
     * 
     * @return array<int, array<string, mixed>>
     */
    public function listPipelines(): array
    {
        return $this->findAll('pipelines', '*', '', [], 'id ASC');
    }

    /**
     * Obtiene un pipeline por su ID
     * 
     * @return array<string, mixed>|null
     */
    public function findPipelineById(int $id): ?array
    {
        return $this->findOne('pipelines', 'id = :id', [':id' => $id]);
    }

    /**
     * Crea un nuevo pipeline
     * 
     * @param array{name: string, is_default?: int} $data
     * @return int ID del pipeline creado
     */
    public function createPipeline(array $data): int
    {
        // Si es el por defecto, quitar el por defecto anterior
        if (isset($data['is_default']) && (int)$data['is_default'] === 1) {
            $this->rawExecute("UPDATE pipelines SET is_default = 0 WHERE tenant_id = :tenant_id");
        }
        return $this->create('pipelines', $data);
    }

    /**
     * Actualiza un pipeline existente
     * 
     * @param array{name?: string, is_default?: int} $data
     */
    public function updatePipeline(int $id, array $data): int
    {
        if (isset($data['is_default']) && (int)$data['is_default'] === 1) {
            $this->rawExecute("UPDATE pipelines SET is_default = 0 WHERE tenant_id = :tenant_id");
        }
        return $this->update('pipelines', $data, 'id = :id', [':id' => $id]);
    }

    /**
     * Elimina un pipeline
     */
    public function deletePipeline(int $id): int
    {
        return $this->delete('pipelines', 'id = :id', [':id' => $id]);
    }

    /**
     * Lista las etapas de un pipeline específico (incluye orden y colores)
     * 
     * @return array<int, array<string, mixed>>
     */
    public function listStages(int $pipelineId): array
    {
        // Validar que el pipeline pertenece al tenant
        $pipeline = $this->findPipelineById($pipelineId);
        if ($pipeline === null) {
            return [];
        }
        
        // Las etapas no tienen tenant_id en su tabla, están vinculadas a pipeline_id.
        // Hacemos un BYPASS_TENANT_SCOPE controlado ya que validamos la propiedad del pipeline antes.
        return $this->rawSelect(
            "/* BYPASS_TENANT_SCOPE */ SELECT * FROM pipeline_stages WHERE pipeline_id = ? ORDER BY sort_order ASC, id ASC",
            [$pipelineId]
        );
    }

    /**
     * Obtiene una etapa por ID
     * 
     * @return array<string, mixed>|null
     */
    public function findStageById(int $id): ?array
    {
        // Las etapas están ligadas a pipelines de este tenant.
        // Hacemos la consulta mediante un join con pipelines para validar pertenencia de tenant.
        $results = $this->rawSelect(
            "SELECT ps.* 
             FROM pipeline_stages ps
             JOIN pipelines p ON p.id = ps.pipeline_id
             WHERE ps.id = :id AND p.tenant_id = :tenant_id
             LIMIT 1",
            [':id' => $id]
        );
        return $results[0] ?? null;
    }

    /**
     * Crea una nueva etapa para un pipeline
     * 
     * @param array{pipeline_id: int, name: string, color_hex: string, sort_order: int, is_won_stage: int} $data
     * @return int ID de la etapa creada
     */
    public function createStage(array $data): int
    {
        // Validar que el pipeline pertenece al tenant
        $pipeline = $this->findPipelineById((int)$data['pipeline_id']);
        if ($pipeline === null) {
            throw new \RuntimeException('Pipeline no encontrado o acceso denegado', 403);
        }
        
        // Las etapas no tienen tenant_id físicamente, usamos inserción directa sin tenant_id en datos
        $columns = implode(', ', array_map(fn($c) => "`{$c}`", array_keys($data)));
        $placeholders = ':' . implode(', :', array_keys($data));
        
        $sql = "/* BYPASS_TENANT_SCOPE */ INSERT INTO pipeline_stages ({$columns}) VALUES ({$placeholders})";
        
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute($data);
        
        return (int)$this->pdo->lastInsertId();
    }

    /**
     * Actualiza una etapa existente
     * 
     * @param array{name?: string, color_hex?: string, sort_order?: int, is_won_stage?: int} $data
     */
    public function updateStage(int $id, array $data): int
    {
        // Validar que la etapa pertenece a este tenant
        $stage = $this->findStageById($id);
        if ($stage === null) {
            throw new \RuntimeException('Etapa no encontrada o acceso denegado', 403);
        }
        
        $setParts = [];
        foreach (array_keys($data) as $col) {
            $setParts[] = "`{$col}` = :{$col}";
        }
        $sql = "/* BYPASS_TENANT_SCOPE */ UPDATE pipeline_stages SET " . implode(', ', $setParts) . " WHERE id = :id";
        
        $params = $data;
        $params['id'] = $id;
        
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute($params);
        return $stmt->rowCount();
    }

    /**
     * Elimina una etapa
     */
    public function deleteStage(int $id): int
    {
        // Validar que la etapa pertenece a este tenant
        $stage = $this->findStageById($id);
        if ($stage === null) {
            throw new \RuntimeException('Etapa no encontrada o acceso denegado', 403);
        }
        
        $stmt = $this->pdo->prepare("/* BYPASS_TENANT_SCOPE */ DELETE FROM pipeline_stages WHERE id = ?");
        $stmt->execute([$id]);
        return $stmt->rowCount();
    }

    /**
     * Bulk update stages: crea, actualiza, reordena y elimina etapas en transaccion
     * 
     * @param int $pipelineId
     * @param array<int, array{id?: int, name: string, color_hex?: string, sort_order?: int, probability?: float, is_won_stage?: int, ui_config?: array|null}> $stages
     */
    public function bulkUpdateStages(int $pipelineId, array $stages): void
    {
        $tenantId = \kodanAPPS\DB\TenantContext::getTenantId();

        $this->transactional(function () use ($pipelineId, $tenantId, $stages) {
            // Obtener IDs existentes de etapas de este pipeline
            $existingStmt = $this->pdo->prepare(
                "/* BYPASS_TENANT_SCOPE */ SELECT id FROM pipeline_stages WHERE pipeline_id = ?"
            );
            $existingStmt->execute([$pipelineId]);
            $existingIds = array_map(fn($r) => (int)$r['id'], $existingStmt->fetchAll());

            $submittedIds = [];

            foreach ($stages as $index => $stage) {
                $name = isset($stage['name']) && is_scalar($stage['name']) ? trim((string)$stage['name']) : '';
                $colorHex = isset($stage['color_hex']) && is_scalar($stage['color_hex']) ? trim((string)$stage['color_hex']) : '#6366F1';
                $sortOrder = (int)($stage['sort_order'] ?? ($index + 1) * 10);
                $probability = (float)($stage['probability'] ?? 0);
                $isWon = isset($stage['is_won_stage']) && $stage['is_won_stage'] ? 1 : 0;
                $isLost = isset($stage['is_lost_stage']) && $stage['is_lost_stage'] ? 1 : 0;
                $uiConfig = isset($stage['ui_config']) && is_array($stage['ui_config'])
                    ? json_encode($stage['ui_config'], JSON_UNESCAPED_UNICODE)
                    : null;

                if ($name === '') continue;

                $stageId = isset($stage['id']) ? (int)$stage['id'] : 0;

                if ($stageId > 0 && in_array($stageId, $existingIds, true)) {
                    // Actualizar existente
                    $updateStmt = $this->pdo->prepare(
                        "/* BYPASS_TENANT_SCOPE */ UPDATE pipeline_stages 
                         SET name = :name, color_hex = :ch, sort_order = :so, probability = :prob, 
                             is_won_stage = :iw, is_lost_stage = :il, ui_config = :uic
                         WHERE id = :id AND pipeline_id = :pid"
                    );
                    $updateStmt->execute([
                        ':id' => $stageId,
                        ':pid' => $pipelineId,
                        ':name' => $name,
                        ':ch' => $colorHex,
                        ':so' => $sortOrder,
                        ':prob' => $probability,
                        ':iw' => $isWon,
                        ':il' => $isLost,
                        ':uic' => $uiConfig,
                    ]);
                    $submittedIds[] = $stageId;
                } else {
                    // Crear nuevo
                    $insertStmt = $this->pdo->prepare(
                        "/* BYPASS_TENANT_SCOPE */ INSERT INTO pipeline_stages (pipeline_id, name, color_hex, sort_order, probability, is_won_stage, is_lost_stage, ui_config, created_at) 
                         VALUES (:pid, :name, :ch, :so, :prob, :iw, :il, :uic, NOW())"
                    );
                    $insertStmt->execute([
                        ':pid' => $pipelineId,
                        ':name' => $name,
                        ':ch' => $colorHex,
                        ':so' => $sortOrder,
                        ':prob' => $probability,
                        ':iw' => $isWon,
                        ':il' => $isLost,
                        ':uic' => $uiConfig,
                    ]);
                    $submittedIds[] = (int)$this->pdo->lastInsertId();
                }
            }

            // Eliminar etapas que ya no estan en el listado
            $toDelete = array_diff($existingIds, $submittedIds);
            foreach ($toDelete as $deleteId) {
                // Reasignar oportunidades huerfanas a la primera etapa restante
                $firstStageId = $submittedIds[0] ?? 0;
                if ($firstStageId > 0) {
                    $reassignStmt = $this->pdo->prepare(
                        "UPDATE opportunities SET pipeline_stage_id = :firstId, updated_at = NOW() WHERE pipeline_stage_id = :delId AND tenant_id = :tid"
                    );
                    $reassignStmt->execute([':firstId' => $firstStageId, ':delId' => $deleteId, ':tid' => $tenantId]);
                }

                $delStmt = $this->pdo->prepare("/* BYPASS_TENANT_SCOPE */ DELETE FROM pipeline_stages WHERE id = ?");
                $delStmt->execute([$deleteId]);
            }
        });
    }
}

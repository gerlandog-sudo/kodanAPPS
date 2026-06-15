<?php

declare(strict_types=1);

namespace kodanAPPS\Repositories;

use kodanAPPS\DB\TenantAwarePDO;

/**
 * PlanRepository - Repositorio para subscription_plans y plan_limits
 * 
 * Extiende BaseRepository. Maneja CRUD de planes y límites relacionales.
 */
final class PlanRepository extends BaseRepository
{
    public function __construct(TenantAwarePDO $pdo)
    {
        parent::__construct($pdo);
    }

    /**
     * Lista todos los planes con sus límites
     * 
     * @return array<int, array<string, mixed>>
     */
    public function findAllWithLimits(): array
    {
        $plans = $this->rawSelect("
            SELECT id, name, description, price, currency, created_at, updated_at
            FROM subscription_plans
            WHERE deleted_at IS NULL
            ORDER BY price ASC, name ASC
        ");

        foreach ($plans as &$plan) {
            $plan['limits'] = $this->getLimits((int)$plan['id']);
        }

        return $plans;
    }

    /**
     * Obtiene límites de un plan
     * 
     * @return array<int, array{module: string, metric: string, value: int}>
     */
    public function getLimits(int $planId): array
    {
        return $this->rawSelect(
            "SELECT module, metric, value FROM plan_limits WHERE plan_id = ? ORDER BY module, metric",
            [$planId]
        );
    }

    /**
     * Crea plan nuevo
     * 
     * @return int Nuevo plan_id
     */
    public function create(string $name, string $description, float $price, string $currency): int
    {
        return $this->create('subscription_plans', [
            'name' => $name,
            'description' => $description,
            'price' => $price,
            'currency' => $currency,
        ]);
    }

    /**
     * Actualiza plan
     */
    public function update(int $planId, array $data): bool
    {
        unset($data['id'], $data['created_at'], $data['deleted_at']);
        if (empty($data)) {
            return false;
        }
        
        $data['updated_at'] = date('Y-m-d H:i:s');
        $rows = $this->update('subscription_plans', $data, 'id = :id', [':id' => $planId]);
        return $rows > 0;
    }

    /**
     * Elimina plan (soft delete)
     */
    public function delete(int $planId): bool
    {
        $rows = $this->update('subscription_plans', [
            'deleted_at' => date('Y-m-d H:i:s'),
        ], 'id = :id', [':id' => $planId]);
        return $rows > 0;
    }

    /**
     * Agrega límite a plan
     */
    public function addLimit(int $planId, string $module, string $metric, int $value): void
    {
        if (!in_array($module, ['crm', 'tracker', 'api'], true)) {
            throw new InvalidArgumentException("Módulo inválido: $module");
        }
        if ($value < 0) {
            throw new InvalidArgumentException("El valor del límite no puede ser negativo");
        }

        $this->rawExecute(
            "INSERT INTO plan_limits (plan_id, module, metric, value)
             VALUES (?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE value = VALUES(value)",
            [$planId, $module, $metric, $value]
        );
    }

    /**
     * Reemplaza todos los límites de un plan
     * 
     * @param array<int, array{module: string, metric: string, value: int}> $limits
     */
    public function replaceLimits(int $planId, array $limits): void
    {
        $this->transactional(function () use ($planId, $limits) {
            // Eliminar existentes
            $this->rawExecute("DELETE FROM plan_limits WHERE plan_id = ?", [$planId]);
            
            // Insertar nuevos
            foreach ($limits as $limit) {
                $this->addLimit(
                    $planId,
                    $limit['module'],
                    $limit['metric'],
                    (int)$limit['value']
                );
            }
        });
    }
}
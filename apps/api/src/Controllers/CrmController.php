<?php

declare(strict_types=1);

namespace kodanAPPS\Controllers;

use kodanAPPS\DB\TenantAwarePDO;
use kodanAPPS\DB\TenantContext;
use InvalidArgumentException;
use RuntimeException;

final class CrmController
{
    private TenantAwarePDO $pdo;

    public function __construct(TenantAwarePDO $pdo)
    {
        $this->pdo = $pdo;
    }

    /**
     * Verifica y consume un slot de negociación de forma atómica.
     * Si no hay capacidad, arroja una excepción.
     */
    public function checkAndIncrementNegotiationsLimit(int $tenantId): void
    {
        // Bloquear el registro de uso para el tenant actual y la métrica de negociaciones
        $stmt = $this->pdo->prepare("
            SELECT pl.value AS limit_value, COALESCE(tpu.current_value, 0) AS current_usage
            FROM tenants t
            JOIN subscription_plans sp ON sp.id = t.subscription_plan_id
            JOIN plan_limits pl ON pl.plan_id = sp.id AND pl.module = 'crm' AND pl.metric = 'negotiations_max'
            LEFT JOIN tenant_plan_usage tpu ON tpu.tenant_id = t.tenant_id AND tpu.module = pl.module AND tpu.metric = pl.metric
            WHERE t.tenant_id = ? AND t.is_active = 1
            FOR UPDATE
        ");
        $stmt->execute([$tenantId]);
        $row = $stmt->fetch();

        if (!is_array($row)) {
            throw new RuntimeException('El módulo de negociaciones no está disponible o el tenant no está activo.', 403);
        }

        $limitValue = isset($row['limit_value']) ? intval($row['limit_value']) : 0;
        $currentUsage = isset($row['current_usage']) ? intval($row['current_usage']) : 0;

        // Si el límite es > 0 y ya hemos alcanzado o superado el límite
        if ($limitValue > 0 && $currentUsage >= $limitValue) {
            throw new RuntimeException("Límite de negociaciones (oportunidades) alcanzado ({$currentUsage}/{$limitValue}). Actualice su plan.", 403);
        }

        // Incrementar el uso de forma segura
        $updateStmt = $this->pdo->prepare("
            INSERT INTO tenant_plan_usage (tenant_id, module, metric, current_value)
            VALUES (?, 'crm', 'negotiations_max', 1)
            ON DUPLICATE KEY UPDATE current_value = current_value + 1
        ");
        $updateStmt->execute([$tenantId]);
    }

    /**
     * Decrementa el contador de negociaciones en uso.
     */
    public function decrementNegotiationsLimit(int $tenantId): void
    {
        $stmt = $this->pdo->prepare("
            UPDATE tenant_plan_usage 
            SET current_value = GREATEST(0, current_value - 1)
            WHERE tenant_id = ? AND module = 'crm' AND metric = 'negotiations_max'
        ");
        $stmt->execute([$tenantId]);
    }

    /**
     * Obtiene el estado actual de los límites y el consumo del plan para CRM
     * 
     * @return array<int, array<string, mixed>>
     */
    public function getPlanStatus(int $tenantId): array
    {
        $stmt = $this->pdo->prepare("
            SELECT module, metric, limit_value, current_usage, has_capacity
            FROM v_tenant_plan_limits
            WHERE tenant_id = ? AND module = 'crm'
        ");
        $stmt->execute([$tenantId]);
        
        $results = $stmt->fetchAll();
        return $results;
    }

    /**
     * @return array{theme: string}
     */
    public function getTheme(): array
    {
        $userId = TenantContext::getUserId();
        $stmt = $this->pdo->prepare(
            "SELECT theme_colors FROM user_configs /* BYPASS_TENANT_SCOPE */
             WHERE user_id = ? AND app_id = 'crm'"
        );
        $stmt->execute([$userId]);
        $result = $stmt->fetch();

        $theme = 'dark';
        if (!empty($result)) {
            $colors = json_decode($result['theme_colors'], true);
            if (isset($colors['theme']) && in_array($colors['theme'], ['light', 'dark'], true)) {
                $theme = $colors['theme'];
            }
        }

        return ['theme' => $theme];
    }

    /**
     * @param array<string, mixed> $input
     * @return array{success: bool, theme: string}
     */
    public function updateTheme(array $input): array
    {
        $theme = $input['theme'] ?? '';
        if (!in_array($theme, ['light', 'dark'], true)) {
            throw new InvalidArgumentException(json_encode([
                'message' => 'Tema inválido',
                'errors' => ['theme' => 'Valores permitidos: light, dark'],
            ], JSON_UNESCAPED_UNICODE), 422);
        }

        $userId = TenantContext::getUserId();
        $stmt = $this->pdo->prepare(
            "INSERT INTO user_configs (user_id, app_id, theme_colors) /* BYPASS_TENANT_SCOPE */
             VALUES (?, 'crm', ?)
             ON DUPLICATE KEY UPDATE theme_colors = VALUES(theme_colors)"
        );
        $stmt->execute([$userId, json_encode(['theme' => $theme])]);

        return ['success' => true, 'theme' => $theme];
    }
}

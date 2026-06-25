<?php

declare(strict_types=1);

namespace kodanAPPS\Controllers;

use kodanAPPS\DB\TenantAwarePDO;
use kodanAPPS\DB\TenantContext;
use kodanAPPS\Services\UsageTrackerInterface;
use InvalidArgumentException;
use RuntimeException;

final class CrmController
{
    private UsageTrackerInterface $usageTracker;
    private TenantAwarePDO $pdo;

    public function __construct(TenantAwarePDO $pdo, UsageTrackerInterface $usageTracker)
    {
        $this->pdo = $pdo;
        $this->usageTracker = $usageTracker;
    }

    /**
     * Verifica y consume un slot de negociación de forma atómica.
     */
    public function checkAndIncrementNegotiationsLimit(int $tenantId): void
    {
        $this->usageTracker->checkAndReserve('crm', 'negotiations_max', 1);
    }

    /**
     * Decrementa el contador de negociaciones en uso.
     */
    public function decrementNegotiationsLimit(int $tenantId): void
    {
        $this->usageTracker->decrement('crm', 'negotiations_max', 1);
    }

    /**
     * Obtiene el estado actual de los límites y el consumo del plan para CRM
     * 
     * @return array<int, array<string, mixed>>
     */
    public function getPlanStatus(int $tenantId): array
    {
        return $this->usageTracker->getUsageStatus('crm');
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

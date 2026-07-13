<?php

declare(strict_types=1);

namespace kodanAPPS\Middleware;

use kodanAPPS\DB\TenantContext;
use kodanAPPS\Services\UsageTrackerInterface;
use Throwable;

final class ApiUsageTracker
{
    private UsageTrackerInterface $usageTracker;

    public function __construct(UsageTrackerInterface $usageTracker)
    {
        $this->usageTracker = $usageTracker;
    }

    public function handle(): void
    {
        try {
            if (!TenantContext::hasTenant()) {
                return;
            }

            $appId = TenantContext::getAppId();
            if ($appId === '' || $appId === 'superadmin') {
                return;
            }

            $this->usageTracker->increment($appId, 'api_calls_month', 1);
        } catch (Throwable $e) {
            // El tracking de uso es NO crítico — si falla (ej. tabla temporal fuera de línea),
            // no debe interrumpir la operación principal del usuario.
            error_log('[ApiUsageTracker] Non-critical error tracking API usage: ' . $e->getMessage());
        }
    }
}

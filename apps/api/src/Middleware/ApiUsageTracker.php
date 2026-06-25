<?php

declare(strict_types=1);

namespace kodanAPPS\Middleware;

use kodanAPPS\DB\TenantContext;
use kodanAPPS\Services\UsageTrackerInterface;

final class ApiUsageTracker
{
    private UsageTrackerInterface $usageTracker;

    public function __construct(UsageTrackerInterface $usageTracker)
    {
        $this->usageTracker = $usageTracker;
    }

    public function handle(): void
    {
        if (!TenantContext::hasTenant()) {
            return;
        }

        $appId = TenantContext::getAppId();
        if ($appId === '' || $appId === 'superadmin') {
            return;
        }

        $this->usageTracker->increment($appId, 'api_calls_month', 1);
    }
}

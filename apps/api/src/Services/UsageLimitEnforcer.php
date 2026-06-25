<?php

declare(strict_types=1);

namespace kodanAPPS\Services;

final class UsageLimitEnforcer
{
    private UsageTrackerInterface $usageTracker;

    public function __construct(UsageTrackerInterface $usageTracker)
    {
        $this->usageTracker = $usageTracker;
    }

    public function enforce(string $module, string $metric, int $amount = 1): void
    {
        $this->usageTracker->checkAndReserve($module, $metric, $amount);
    }

    public function increment(string $module, string $metric, int $amount = 1): void
    {
        $this->usageTracker->increment($module, $metric, $amount);
    }
}

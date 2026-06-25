<?php

declare(strict_types=1);

namespace kodanAPPS\Services;

final class AppAccessService
{
    public function __construct(
        public readonly PlanAccessValidator $planAccess,
        public readonly UsageLimitEnforcer $limitEnforcer,
        public readonly TenantOverrideManager $overrideManager,
        public readonly UsageTrackerInterface $usageTracker,
    ) {}

    public function validateAppAccess(int $tenantId, string $appId, int $userId): array
    {
        return $this->planAccess->validateAppAccess($tenantId, $appId, $userId);
    }

    public function checkLimit(string $module, string $metric): void
    {
        $this->limitEnforcer->enforce($module, $metric);
    }

    public function incrementUsage(string $module, string $metric, int $amount = 1): void
    {
        $this->limitEnforcer->increment($module, $metric, $amount);
    }

    public function getUsageStatus(string $module): array
    {
        return $this->usageTracker->getUsageStatus($module);
    }

    public function getAllUsageStatus(): array
    {
        return $this->usageTracker->getAllUsageStatus();
    }

    public function setTenantOverride(int $tenantId, string $module, string $metric, int $customValue): void
    {
        $this->overrideManager->setOverride($tenantId, $module, $metric, $customValue);
    }

    public function clearTenantOverride(int $tenantId, string $module, string $metric): void
    {
        $this->overrideManager->clearOverride($tenantId, $module, $metric);
    }

    public function initializeTenant(int $tenantId, int $planId): void
    {
        $this->usageTracker->initializeTenant($tenantId, $planId);
    }

    public function getContractedApps(int $tenantId): array
    {
        return $this->usageTracker->getContractedApps($tenantId);
    }

    public function processRecountQueue(): void
    {
        $this->usageTracker->processRecountQueue();
    }
}

<?php

declare(strict_types=1);

namespace kodanAPPS\Services;

interface UsageTrackerInterface
{
    public function checkAndReserve(string $module, string $metric, int $amount = 1): void;

    public function increment(string $module, string $metric, int $amount = 1): void;

    public function decrement(string $module, string $metric, int $amount = 1): void;

    /** @return array<int, array<string, mixed>> */
    public function getUsageStatus(string $module): array;

    /** @return array<int, array<string, mixed>> */
    public function getAllUsageStatus(): array;

    public function initializeTenant(int $tenantId, int $planId): void;

    /** @return array<int, string> */
    public function getContractedApps(int $tenantId): array;

    /** @param array<int, array<string, mixed>> $usageData */
    public function checkAndScheduleRecount(string $module, array $usageData): void;

    public function processRecountQueue(): void;
}

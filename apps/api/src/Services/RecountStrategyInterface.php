<?php

declare(strict_types=1);

namespace kodanAPPS\Services;

interface RecountStrategyInterface
{
    public function getModule(): string;

    public function recount(int $tenantId, \kodanAPPS\DB\TenantAwarePDO $pdo): void;
}

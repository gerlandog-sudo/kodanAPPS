<?php

declare(strict_types=1);

namespace Kodan\Apps\Api;

final readonly class Dummy
{
    public function getStatus(): string
    {
        return 'ok';
    }
}

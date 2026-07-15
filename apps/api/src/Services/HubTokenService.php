<?php

declare(strict_types=1);

namespace kodanAPPS\Services;

/**
 * HubTokenService - Generación y validación de tokens KDN.
 *
 * Formato: KDN-[PREFIX]-[HASH]
 * El prefijo se deriva de las iniciales del nombre de la app.
 * El hash es MD5 (truncado a 16 chars uppercase) de uniqid().
 */
final class HubTokenService
{
    /**
     * Genera un token KDN para una aplicación.
     */
    public function generateToken(string $appName): string
    {
        $cleanName = preg_replace('/[^A-Za-z0-9 ]/', '', $appName);
        $words = explode(' ', trim($cleanName));
        $prefix = '';

        if (count($words) > 1) {
            foreach ($words as $w) {
                $prefix .= strtoupper(substr($w, 0, 1));
            }
        } else {
            $prefix = strtoupper(substr($cleanName, 0, 2));
        }

        $hash = strtoupper(substr(md5(uniqid()), 0, 16));

        return "KDN-{$prefix}-{$hash}";
    }

    /**
     * Valida el formato de un token KDN.
     */
    public function isValidFormat(string $token): bool
    {
        return (bool)preg_match('/^KDN-[A-Z0-9]+-[A-F0-9]{16}$/', trim($token));
    }
}

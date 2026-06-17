<?php

declare(strict_types=1);

namespace kodanAPPS\DTOs;

use InvalidArgumentException;

/**
 * DTO inmutable para validar payload de creación de Tenant (Super Admin)
 * 
 * Incluye:
 * - name, subscription_plan_id (plan determina apps disponibles)
 * - logo_url (base64 opcional)
 * - admin_name, admin_email, admin_password
 * - theme_preference (light/dark, opcional)
 * 
 * NOTA: Ya no se recibe enabled_apps — el plan determina qué apps
 * puede usar el tenant. El admin recibe rol 'admin' en todas las apps
 * que el plan incluya (definido por plan_limits.module).
 */
final readonly class TenantCreateDTO
{
    public string $name;
    public int $subscriptionPlanId;
    public ?string $logoUrl;
    public string $themePreference;
    public string $adminName;
    public string $adminEmail;
    public string $adminPassword;

    /**
     * @param array{
     *     name: string,
     *     subscription_plan_id: int,
     *     logo_url?: string|null,
     *     theme_preference?: string,
     *     admin_name: string,
     *     admin_email: string,
     *     admin_password: string
     * } $data
     * 
     * @throws InvalidArgumentException Si validación falla
     */
    public function __construct(array $data)
    {
        $this->validate($data);

        $this->name = trim($data['name']);
        $this->subscriptionPlanId = (int)$data['subscription_plan_id'];
        $this->logoUrl = (isset($data['logo_url']) && $data['logo_url'] !== '')
            ? $data['logo_url']
            : null;
        $this->themePreference = isset($data['theme_preference']) && in_array($data['theme_preference'], ['light', 'dark'], true)
            ? $data['theme_preference']
            : 'dark';
        $this->adminName = trim($data['admin_name']);
        $this->adminEmail = strtolower(trim($data['admin_email']));
        $this->adminPassword = $data['admin_password'];
    }

    /**
     * Validación estricta de entrada
     * 
     * @param array<string, mixed> $data
     * @throws InvalidArgumentException Con mensaje estructurado para respuesta 422
     */
    private function validate(array $data): void
    {
        $errors = [];

        // name: requerido, 2-255 chars
        if (!isset($data['name']) || !is_string($data['name'])) {
            $errors['name'] = 'El nombre es requerido';
        } elseif (strlen(trim($data['name'])) < 2 || strlen(trim($data['name'])) > 255) {
            $errors['name'] = 'El nombre debe tener entre 2 y 255 caracteres';
        }

        // subscription_plan_id: requerido, entero positivo
        if (!isset($data['subscription_plan_id']) || !is_numeric($data['subscription_plan_id'])) {
            $errors['subscription_plan_id'] = 'El plan de suscripción es requerido';
        } elseif ((int)$data['subscription_plan_id'] <= 0) {
            $errors['subscription_plan_id'] = 'Plan de suscripción inválido';
        }

        // enabled_apps: eliminado — el plan determina las apps disponibles

        // logo_url: opcional, validar tamaño si se provee
        if (isset($data['logo_url']) && is_string($data['logo_url']) && $data['logo_url'] !== '') {
            $decoded = base64_decode(explode(',', $data['logo_url'])[1] ?? $data['logo_url'], true);
            if ($decoded !== false && strlen($decoded) > 512000) {
                $errors['logo_url'] = 'El logo no debe superar 500KB';
            }
        }

        // theme_preference: opcional, valores permitidos
        if (isset($data['theme_preference']) && !in_array($data['theme_preference'], ['light', 'dark'], true)) {
            $errors['theme_preference'] = 'El tema debe ser light o dark';
        }

        // admin_name: requerido, 2-100 chars
        if (!isset($data['admin_name']) || !is_string($data['admin_name'])) {
            $errors['admin_name'] = 'El nombre del administrador es requerido';
        } elseif (strlen(trim($data['admin_name'])) < 2 || strlen(trim($data['admin_name'])) > 100) {
            $errors['admin_name'] = 'El nombre del administrador debe tener entre 2 y 100 caracteres';
        }

        // admin_email: requerido, formato email válido
        if (!isset($data['admin_email']) || !is_string($data['admin_email'])) {
            $errors['admin_email'] = 'El email del administrador es requerido';
        } elseif (!filter_var(trim($data['admin_email']), FILTER_VALIDATE_EMAIL)) {
            $errors['admin_email'] = 'Formato de email inválido';
        } elseif (strlen(trim($data['admin_email'])) > 255) {
            $errors['admin_email'] = 'El email no puede exceder 255 caracteres';
        }

        // admin_password: requerido, mínimo 8 caracteres
        if (!isset($data['admin_password']) || !is_string($data['admin_password'])) {
            $errors['admin_password'] = 'La contraseña del administrador es requerida';
        } elseif (strlen($data['admin_password']) < 8) {
            $errors['admin_password'] = 'La contraseña debe tener al menos 8 caracteres';
        }

        if (!empty($errors)) {
            throw new InvalidArgumentException(json_encode($errors, JSON_UNESCAPED_UNICODE));
        }
    }

    /**
     * Convierte a array para uso en repositorios/servicios
     * 
     * @return array<string, mixed>
     */
    public function toArray(): array
    {
        return [
            'name' => $this->name,
            'subscription_plan_id' => $this->subscriptionPlanId,
            'logo_url' => $this->logoUrl,
            'theme_preference' => $this->themePreference,
            'admin_name' => $this->adminName,
            'admin_email' => $this->adminEmail,
            'admin_password' => $this->adminPassword,
        ];
    }
}

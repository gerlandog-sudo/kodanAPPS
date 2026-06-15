<?php

declare(strict_types=1);

namespace kodanAPPS\DTOs;

use InvalidArgumentException;

/**
 * DTO inmutable para validar payload de creación de Tenant (Super Admin)
 * 
 * NO incluye admin_password: el backend genera password seguro y envía
 * token set-password via email (tabla password_resets existente)
 */
final readonly class TenantCreateDTO
{
    public string $name;
    public string $slug;
    public int $subscriptionPlanId;
    /** @var array<string> Valores permitidos: 'crm', 'tracker' */
    public array $enabledApps;
    public string $adminName;
    public string $adminEmail;

    /**
     * @param array{
     *     name: string,
     *     slug: string,
     *     subscription_plan_id: int,
     *     enabled_apps: array<string>,
     *     admin_name: string,
     *     admin_email: string
     * } $data
     * 
     * @throws InvalidArgumentException Si validación falla
     */
    public function __construct(array $data)
    {
        $this->validate($data);
        
        $this->name = trim($data['name']);
        $this->slug = strtolower(trim($data['slug']));
        $this->subscriptionPlanId = (int)$data['subscription_plan_id'];
        $this->enabledApps = array_values(array_unique(array_map('strtolower', $data['enabled_apps'])));
        $this->adminName = trim($data['admin_name']);
        $this->adminEmail = strtolower(trim($data['admin_email']));
    }

    /**
     * Validación estricta de entrada
     * 
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

        // slug: requerido, formato slug, único (se verifica en BD)
        if (!isset($data['slug']) || !is_string($data['slug'])) {
            $errors['slug'] = 'El slug es requerido';
        } else {
            $slug = strtolower(trim($data['slug']));
            if ($slug === '') {
                $errors['slug'] = 'El slug no puede estar vacío';
            } elseif (!preg_match('/^[a-z0-9-]+$/', $slug)) {
                $errors['slug'] = 'El slug solo puede contener letras minúsculas, números y guiones';
            } elseif (strlen($slug) < 2 || strlen($slug) > 50) {
                $errors['slug'] = 'El slug debe tener entre 2 y 50 caracteres';
            } elseif (in_array($slug, ['api', 'crm', 'tracker', 'superadmin', 'www', 'mail', 'ftp', 'admin', 'system'], true)) {
                $errors['slug'] = 'Este slug está reservado';
            }
        }

        // subscription_plan_id: requerido, entero positivo
        if (!isset($data['subscription_plan_id']) || !is_numeric($data['subscription_plan_id'])) {
            $errors['subscription_plan_id'] = 'El plan de suscripción es requerido';
        } elseif ((int)$data['subscription_plan_id'] <= 0) {
            $errors['subscription_plan_id'] = 'Plan de suscripción inválido';
        }

        // enabled_apps: array, al menos uno, valores permitidos
        if (!isset($data['enabled_apps']) || !is_array($data['enabled_apps'])) {
            $errors['enabled_apps'] = 'Debe seleccionar al menos una aplicación';
        } else {
            $allowedApps = ['crm', 'tracker'];
            $providedApps = array_map('strtolower', $data['enabled_apps']);
            $invalidApps = array_diff($providedApps, $allowedApps);
            if (!empty($invalidApps)) {
                $errors['enabled_apps'] = 'Aplicaciones no válidas: ' . implode(', ', $invalidApps) . '. Permitidas: crm, tracker';
            }
            if (empty($providedApps)) {
                $errors['enabled_apps'] = 'Debe seleccionar al menos una aplicación';
            }
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

        if (!empty($errors)) {
            throw new InvalidArgumentException(json_encode($errors, JSON_UNESCAPED_UNICODE));
        }
    }

    /**
     * Convierte a array para uso en repositorios/servicios
     * 
     * @return array{
     *     name: string,
     *     slug: string,
     *     subscription_plan_id: int,
     *     enabled_apps: array<string>,
     *     admin_name: string,
     *     admin_email: string
     * }
     */
    public function toArray(): array
    {
        return [
            'name' => $this->name,
            'slug' => $this->slug,
            'subscription_plan_id' => $this->subscriptionPlanId,
            'enabled_apps' => $this->enabledApps,
            'admin_name' => $this->adminName,
            'admin_email' => $this->adminEmail,
        ];
    }
}
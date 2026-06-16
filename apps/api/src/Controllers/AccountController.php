<?php

declare(strict_types=1);

namespace kodanAPPS\Controllers;

use kodanAPPS\Repositories\AccountRepository;
use InvalidArgumentException;
use RuntimeException;

final class AccountController
{
    private AccountRepository $accountRepo;

    public function __construct(AccountRepository $accountRepo)
    {
        $this->accountRepo = $accountRepo;
    }

    /**
     * GET /api/crm/accounts
     * 
     * @return array<int, array<string, mixed>>
     */
    public function list(): array
    {
        return $this->accountRepo->listAll();
    }

    /**
     * GET /api/crm/accounts/{id}
     * 
     * @return array<string, mixed>
     */
    public function get(int $id): array
    {
        $account = $this->accountRepo->findById($id);
        if ($account === null) {
            throw new RuntimeException('Cuenta no encontrada.', 404);
        }
        
        // Decodificar custom_fields si viene como string
        if (isset($account['custom_fields']) && is_string($account['custom_fields'])) {
            $account['custom_fields'] = json_decode($account['custom_fields'], true) ?? [];
        }

        return $account;
    }

    /**
     * POST /api/crm/accounts
     * 
     * @param array<string, mixed> $input
     * @return array{success: bool, id: int, message: string}
     */
    public function create(array $input): array
    {
        $name = isset($input['name']) && is_scalar($input['name']) ? trim((string)$input['name']) : '';
        if ($name === '') {
            throw new InvalidArgumentException((string)json_encode([
                'message' => 'Campos requeridos faltantes',
                'errors' => ['name' => 'El nombre de la cuenta es requerido.']
            ], JSON_UNESCAPED_UNICODE));
        }

        $customFields = isset($input['custom_fields']) && is_array($input['custom_fields']) ? $input['custom_fields'] : [];

        $data = [
            'name' => $name,
            'legal_name' => isset($input['legal_name']) && is_scalar($input['legal_name']) ? trim((string)$input['legal_name']) : null,
            'tax_id' => isset($input['tax_id']) && is_scalar($input['tax_id']) ? trim((string)$input['tax_id']) : null,
            'website' => isset($input['website']) && is_scalar($input['website']) ? trim((string)$input['website']) : null,
            'phone' => isset($input['phone']) && is_scalar($input['phone']) ? trim((string)$input['phone']) : null,
            'address' => isset($input['address']) && is_scalar($input['address']) ? trim((string)$input['address']) : null,
            'custom_fields' => $customFields,
        ];

        $id = $this->accountRepo->createAccount($data);

        return [
            'success' => true,
            'id' => $id,
            'message' => 'Cuenta creada exitosamente.'
        ];
    }

    /**
     * PATCH/PUT /api/crm/accounts/{id}
     * 
     * @param array<string, mixed> $input
     * @return array{success: bool, affected: int, message: string}
     */
    public function update(int $id, array $input): array
    {
        $account = $this->accountRepo->findById($id);
        if ($account === null) {
            throw new RuntimeException('Cuenta no encontrada.', 404);
        }

        $data = [];
        if (isset($input['name'])) {
            $name = is_scalar($input['name']) ? trim((string)$input['name']) : '';
            if ($name === '') {
                throw new InvalidArgumentException((string)json_encode([
                    'message' => 'Campos requeridos faltantes',
                    'errors' => ['name' => 'El nombre no puede estar vacío.']
                ], JSON_UNESCAPED_UNICODE));
            }
            $data['name'] = $name;
        }

        if (array_key_exists('legal_name', $input)) {
            $data['legal_name'] = isset($input['legal_name']) && is_scalar($input['legal_name']) ? trim((string)$input['legal_name']) : null;
        }
        if (array_key_exists('tax_id', $input)) {
            $data['tax_id'] = isset($input['tax_id']) && is_scalar($input['tax_id']) ? trim((string)$input['tax_id']) : null;
        }
        if (array_key_exists('website', $input)) {
            $data['website'] = isset($input['website']) && is_scalar($input['website']) ? trim((string)$input['website']) : null;
        }
        if (array_key_exists('phone', $input)) {
            $data['phone'] = isset($input['phone']) && is_scalar($input['phone']) ? trim((string)$input['phone']) : null;
        }
        if (array_key_exists('address', $input)) {
            $data['address'] = isset($input['address']) && is_scalar($input['address']) ? trim((string)$input['address']) : null;
        }
        if (isset($input['custom_fields']) && is_array($input['custom_fields'])) {
            $data['custom_fields'] = $input['custom_fields'];
        }

        if (empty($data)) {
            return [
                'success' => true,
                'affected' => 0,
                'message' => 'No se enviaron campos para actualizar.'
            ];
        }

        $affected = $this->accountRepo->updateAccount($id, $data);

        return [
            'success' => true,
            'affected' => $affected,
            'message' => 'Cuenta actualizada exitosamente.'
        ];
    }

    /**
     * DELETE /api/crm/accounts/{id}
     * 
     * @return array{success: bool, message: string}
     */
    public function delete(int $id): array
    {
        $account = $this->accountRepo->findById($id);
        if ($account === null) {
            throw new RuntimeException('Cuenta no encontrada.', 404);
        }

        $this->accountRepo->deleteAccount($id);

        return [
            'success' => true,
            'message' => 'Cuenta eliminada exitosamente.'
        ];
    }
}

<?php

declare(strict_types=1);

namespace kodanAPPS\Repositories;

/**
 * AccountRepository - Gestión de Cuentas comerciales (Empresas) B2B
 * 
 * @extends BaseRepository<array{account_id: int, tenant_id: int, name: string, legal_name: string|null, tax_id: string|null, website: string|null, phone: string|null, address: string|null, custom_fields: string, created_at: string, updated_at: string}>
 */
final class AccountRepository extends BaseRepository
{
    protected const TABLE = self::TABLE;

    /**
     * Obtiene una cuenta por su ID
     * 
     * @return array<string, mixed>|null
     */
    public function findById(int $id): ?array
    {
        return $this->findOne(self::TABLE, 'account_id = :id', [':id' => $id]);
    }

    /**
     * Lista todas las cuentas del tenant
     * 
     * @return array<int, array<string, mixed>>
     */
    public function listAll(): array
    {
        return $this->findAll(self::TABLE, '*', '', [], 'name ASC');
    }

    /**
     * Crea una nueva cuenta
     * 
     * @param array{name: string, legal_name: string|null, tax_id: string|null, website: string|null, phone: string|null, address: string|null, custom_fields?: array<string, mixed>} $data
     * @return int ID de la cuenta creada
     */
    public function createAccount(array $data): int
    {
        if (isset($data['custom_fields'])) {
            $data['custom_fields'] = json_encode($data['custom_fields']);
        } else {
            $data['custom_fields'] = '{}';
        }
        
        return $this->create(self::TABLE, $data);
    }

    /**
     * Actualiza una cuenta existente
     * 
     * @param array{name?: string, legal_name?: string|null, tax_id?: string|null, website?: string|null, phone?: string|null, address?: string|null, custom_fields?: array<string, mixed>} $data
     */
    public function updateAccount(int $id, array $data): int
    {
        if (isset($data['custom_fields'])) {
            $data['custom_fields'] = json_encode($data['custom_fields']);
        }
        
        return $this->update(self::TABLE, $data, 'account_id = :id', [':id' => $id]);
    }

    /**
     * Elimina una cuenta
     */
    public function deleteAccount(int $id): int
    {
        return $this->delete(self::TABLE, 'account_id = :id', [':id' => $id]);
    }
}

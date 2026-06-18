<?php

declare(strict_types=1);

namespace kodanAPPS\Repositories;

/**
 * ContactRepository - Gestión de Contactos comerciales
 * 
 * @extends BaseRepository<array{contact_id: int, tenant_id: int, account_id: int|null, first_name: string, last_name: string, email: string, phone: string|null, mobile: string|null, custom_fields: string, created_at: string, updated_at: string}>
 */
final class ContactRepository extends BaseRepository
{
    protected const TABLE = 'contacts';

    /**
     * Obtiene un contacto por su ID
     * 
     * @return array<string, mixed>|null
     */
    public function findById(int $id): ?array
    {
        return $this->findOne(self::TABLE, 'contact_id = :id', [':id' => $id]);
    }

    /**
     * Lista todos los contactos del tenant
     * 
     * @return array<int, array<string, mixed>>
     */
    public function listAll(): array
    {
        return $this->findAll(self::TABLE, '*', '', [], 'first_name ASC, last_name ASC');
    }

    /**
     * Lista contactos vinculados a una cuenta específica
     * 
     * @return array<int, array<string, mixed>>
     */
    public function listByAccount(int $accountId): array
    {
        return $this->findAll(self::TABLE, '*', 'account_id = :account_id', [':account_id' => $accountId], 'first_name ASC, last_name ASC');
    }

    /**
     * Crea un nuevo contacto
     * 
     * @param array{account_id: int|null, first_name: string, last_name: string, email: string, phone: string|null, mobile: string|null, custom_fields?: array<string, mixed>} $data
     * @return int ID del contacto creado
     */
    public function createContact(array $data): int
    {
        if (isset($data['custom_fields'])) {
            $data['custom_fields'] = json_encode($data['custom_fields']);
        } else {
            $data['custom_fields'] = '{}';
        }
        
        return $this->create(self::TABLE, $data);
    }

    /**
     * Actualiza un contacto existente
     * 
     * @param array{account_id?: int|null, first_name?: string, last_name?: string, email?: string, phone?: string|null, mobile?: string|null, custom_fields?: array<string, mixed>} $data
     */
    public function updateContact(int $id, array $data): int
    {
        if (isset($data['custom_fields'])) {
            $data['custom_fields'] = json_encode($data['custom_fields']);
        }
        
        return $this->update(self::TABLE, $data, 'contact_id = :id', [':id' => $id]);
    }

    /**
     * Elimina un contacto
     */
    public function deleteContact(int $id): int
    {
        return $this->delete(self::TABLE, 'contact_id = :id', [':id' => $id]);
    }
}

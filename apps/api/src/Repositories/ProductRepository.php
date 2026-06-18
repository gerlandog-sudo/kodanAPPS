<?php

declare(strict_types=1);

namespace kodanAPPS\Repositories;

/**
 * ProductRepository - Gestión del Catálogo de Productos/Servicios
 * 
 * @extends BaseRepository<array{id: int, tenant_id: int, name: string, sku: string|null, price: string}>
 */
final class ProductRepository extends BaseRepository
{
    protected const TABLE = self::TABLE;

    /**
     * Obtiene un producto por su ID
     * 
     * @return array<string, mixed>|null
     */
    public function findById(int $id): ?array
    {
        return $this->findOne(self::TABLE, 'id = :id', [':id' => $id]);
    }

    /**
     * Lista todos los productos del tenant
     * 
     * @return array<int, array<string, mixed>>
     */
    public function listAll(): array
    {
        return $this->findAll(self::TABLE, '*', '', [], 'name ASC');
    }

    /**
     * Crea un nuevo producto en el catálogo
     * 
     * @param array{name: string, sku: string|null, price: float} $data
     * @return int ID del producto creado
     */
    public function createProduct(array $data): int
    {
        return $this->create(self::TABLE, $data);
    }

    /**
     * Actualiza un producto existente
     * 
     * @param array{name?: string, sku?: string|null, price?: float} $data
     */
    public function updateProduct(int $id, array $data): int
    {
        return $this->update(self::TABLE, $data, 'id = :id', [':id' => $id]);
    }

    /**
     * Elimina un producto del catálogo
     */
    public function deleteProduct(int $id): int
    {
        return $this->delete(self::TABLE, 'id = :id', [':id' => $id]);
    }
}

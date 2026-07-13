<?php

declare(strict_types=1);

namespace kodanAPPS\Controllers;

use kodanAPPS\Repositories\ProductRepository;
use InvalidArgumentException;
use RuntimeException;
use Throwable;

final class ProductController
{
    private ProductRepository $productRepo;

    public function __construct(ProductRepository $productRepo)
    {
        $this->productRepo = $productRepo;
    }

    /**
     * GET /api/crm/products
     * 
     * @return array<int, array<string, mixed>>
     */
    public function list(): array
    {
        try {
            return $this->productRepo->listAll();
        } catch (Throwable $e) {
            error_log('[ProductController] Error listing products: ' . $e->getMessage() . ' in ' . $e->getFile() . ':' . $e->getLine());
            throw new RuntimeException('Error al cargar el catálogo de productos.', 500);
        }
    }

    /**
     * GET /api/crm/products/{id}
     * 
     * @return array<string, mixed>
     */
    public function get(int $id): array
    {
        $product = $this->productRepo->findById($id);
        if ($product === null) {
            throw new RuntimeException('Producto no encontrado.', 404);
        }
        return $product;
    }

    /**
     * POST /api/crm/products
     * 
     * @param array<string, mixed> $input
     * @return array{success: bool, id: int, message: string}
     */
    public function create(array $input): array
    {
        $name = isset($input['name']) && is_scalar($input['name']) ? trim((string)$input['name']) : '';
        $price = isset($input['price']) && is_scalar($input['price']) ? (float)$input['price'] : -1.00;

        $errors = [];
        if ($name === '') {
            $errors['name'] = 'El nombre del producto es requerido.';
        }
        if ($price < 0) {
            $errors['price'] = 'El precio debe ser un número igual o mayor a cero.';
        }

        if (!empty($errors)) {
            throw new InvalidArgumentException((string)json_encode([
                'message' => 'Campos requeridos faltantes o inválidos',
                'errors' => $errors
            ], JSON_UNESCAPED_UNICODE));
        }

        $data = [
            'name' => $name,
            'sku' => isset($input['sku']) && is_scalar($input['sku']) ? trim((string)$input['sku']) : null,
            'description' => isset($input['description']) && is_scalar($input['description']) ? trim((string)$input['description']) : null,
            'price' => $price,
            'is_active' => isset($input['is_active']) ? (int)$input['is_active'] : 1,
        ];

        try {
            $id = $this->productRepo->createProduct($data);
        } catch (Throwable $e) {
            error_log('[ProductController] Error creating product: ' . $e->getMessage() . ' in ' . $e->getFile() . ':' . $e->getLine());
            throw new RuntimeException('Error al crear el producto. Intente nuevamente.', 500);
        }

        return [
            'success' => true,
            'id' => $id,
            'message' => 'Producto creado exitosamente.'
        ];
    }

    /**
     * PATCH/PUT /api/crm/products/{id}
     * 
     * @param array<string, mixed> $input
     * @return array{success: bool, affected: int, message: string}
     */
    public function update(int $id, array $input): array
    {
        $product = $this->productRepo->findById($id);
        if ($product === null) {
            throw new RuntimeException('Producto no encontrado.', 404);
        }

        $data = [];
        if (isset($input['name'])) {
            $name = is_scalar($input['name']) ? trim((string)$input['name']) : '';
            if ($name === '') {
                throw new InvalidArgumentException((string)json_encode([
                    'message' => 'Validación fallida',
                    'errors' => ['name' => 'El nombre no puede estar vacío.']
                ], JSON_UNESCAPED_UNICODE));
            }
            $data['name'] = $name;
        }

        if (array_key_exists('sku', $input)) {
            $data['sku'] = isset($input['sku']) && is_scalar($input['sku']) ? trim((string)$input['sku']) : null;
        }

        if (isset($input['price'])) {
            $price = is_scalar($input['price']) ? (float)$input['price'] : -1.00;
            if ($price < 0) {
                throw new InvalidArgumentException((string)json_encode([
                    'message' => 'Validación fallida',
                    'errors' => ['price' => 'El precio debe ser igual o mayor a cero.']
                ], JSON_UNESCAPED_UNICODE));
            }
            $data['price'] = $price;
        }

        if (array_key_exists('description', $input)) {
            $data['description'] = isset($input['description']) && is_scalar($input['description']) ? trim((string)$input['description']) : null;
        }

        if (array_key_exists('is_active', $input)) {
            $data['is_active'] = (int)$input['is_active'];
        }

        if (empty($data)) {
            return [
                'success' => true,
                'affected' => 0,
                'message' => 'No se enviaron campos para actualizar.'
            ];
        }

        $affected = $this->productRepo->updateProduct($id, $data);

        return [
            'success' => true,
            'affected' => $affected,
            'message' => 'Producto actualizado exitosamente.'
        ];
    }

    /**
     * DELETE /api/crm/products/{id}
     * 
     * @return array{success: bool, message: string}
     */
    public function delete(int $id): array
    {
        $product = $this->productRepo->findById($id);
        if ($product === null) {
            throw new RuntimeException('Producto no encontrado.', 404);
        }

        $this->productRepo->deleteProduct($id);

        return [
            'success' => true,
            'message' => 'Producto eliminado exitosamente.'
        ];
    }
}

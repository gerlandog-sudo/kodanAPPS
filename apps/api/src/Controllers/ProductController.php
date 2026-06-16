<?php

declare(strict_types=1);

namespace kodanAPPS\Controllers;

use kodanAPPS\Repositories\ProductRepository;
use InvalidArgumentException;
use RuntimeException;

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
        return $this->productRepo->listAll();
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
            'price' => $price,
        ];

        $id = $this->productRepo->createProduct($data);

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

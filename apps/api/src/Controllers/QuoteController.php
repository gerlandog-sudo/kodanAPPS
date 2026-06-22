<?php

declare(strict_types=1);

namespace kodanAPPS\Controllers;

use kodanAPPS\Repositories\QuoteRepository;
use InvalidArgumentException;
use RuntimeException;

final class QuoteController
{
    private QuoteRepository $quoteRepo;

    public function __construct(QuoteRepository $quoteRepo)
    {
        $this->quoteRepo = $quoteRepo;
    }

    /**
     * GET /api/crm/quotes
     * 
     * @return array<int, array<string, mixed>>
     */
    public function list(): array
    {
        $opportunityId = isset($_GET['opportunity_id']) ? (int)$_GET['opportunity_id'] : 0;
        return $this->quoteRepo->listAll($opportunityId);
    }

    /**
     * GET /api/crm/quotes/{id}
     * 
     * @return array<string, mixed>
     */
    public function get(int $id): array
    {
        $quote = $this->quoteRepo->getQuoteWithDetails($id);
        if ($quote === null) {
            throw new RuntimeException('Cotización no encontrada.', 404);
        }

        // Cargar ítems
        $quote['items'] = $this->quoteRepo->getQuoteLineItems($id);

        return $quote;
    }

    /**
     * POST /api/crm/quotes
     * 
     * @param array<string, mixed> $input
     * @return array{success: bool, id: int, message: string}
     */
    public function create(array $input): array
    {
        $opportunityId = isset($input['opportunity_id']) && is_scalar($input['opportunity_id']) ? (int)$input['opportunity_id'] : 0;
        $quoteNumber = isset($input['quote_number']) && is_scalar($input['quote_number']) ? trim((string)$input['quote_number']) : '';
        $status = isset($input['status']) && is_scalar($input['status']) ? trim((string)$input['status']) : 'draft'; // draft, sent, accepted, declined
        $totalAmount = isset($input['total_amount']) && is_scalar($input['total_amount']) ? (float)$input['total_amount'] : 0.00;

        $errors = [];
        if ($opportunityId <= 0) {
            $errors['opportunity_id'] = 'La oportunidad asociada es requerida.';
        }
        if ($quoteNumber === '') {
            $errors['quote_number'] = 'El número de cotización es requerido.';
        }

        if (!empty($errors)) {
            throw new InvalidArgumentException((string)json_encode([
                'message' => 'Campos requeridos faltantes',
                'errors' => $errors
            ], JSON_UNESCAPED_UNICODE));
        }

        $data = [
            'opportunity_id' => $opportunityId,
            'quote_number' => $quoteNumber,
            'status' => $status,
            'total_amount' => $totalAmount,
        ];

        $id = $this->quoteRepo->createQuote($data);

        // Guardar ítems si se pasan
        if (isset($input['items']) && is_array($input['items'])) {
            $this->quoteRepo->saveQuoteLineItems($id, $input['items']);
        }

        return [
            'success' => true,
            'id' => $id,
            'message' => 'Cotización creada exitosamente.'
        ];
    }

    /**
     * PATCH/PUT /api/crm/quotes/{id}
     * 
     * @param array<string, mixed> $input
     * @return array{success: bool, affected: int, message: string}
     */
    public function update(int $id, array $input): array
    {
        $quote = $this->quoteRepo->findById($id);
        if ($quote === null) {
            throw new RuntimeException('Cotización no encontrada.', 404);
        }

        $data = [];
        if (isset($input['quote_number'])) {
            $quoteNumber = is_scalar($input['quote_number']) ? trim((string)$input['quote_number']) : '';
            if ($quoteNumber === '') {
                throw new InvalidArgumentException((string)json_encode([
                    'message' => 'Validación fallida',
                    'errors' => ['quote_number' => 'El número no puede estar vacío.']
                ], JSON_UNESCAPED_UNICODE));
            }
            $data['quote_number'] = $quoteNumber;
        }

        if (isset($input['status']) && is_scalar($input['status'])) {
            $data['status'] = trim((string)$input['status']);
        }

        if (isset($input['total_amount']) && is_scalar($input['total_amount'])) {
            $data['total_amount'] = (float)$input['total_amount'];
        }

        $affected = 0;
        if (!empty($data)) {
            $affected = $this->quoteRepo->updateQuote($id, $data);
        }

        if (isset($input['items']) && is_array($input['items'])) {
            $this->quoteRepo->saveQuoteLineItems($id, $input['items']);
            $affected = 1;
        }

        return [
            'success' => true,
            'affected' => $affected,
            'message' => 'Cotización actualizada exitosamente.'
        ];
    }

    /**
     * DELETE /api/crm/quotes/{id}
     * 
     * @return array{success: bool, message: string}
     */
    public function delete(int $id): array
    {
        $quote = $this->quoteRepo->findById($id);
        if ($quote === null) {
            throw new RuntimeException('Cotización no encontrada.', 404);
        }

        $this->quoteRepo->deleteQuote($id);

        return [
            'success' => true,
            'message' => 'Cotización eliminada exitosamente.'
        ];
    }

    /**
     * GET /api/crm/quotes/{id}/items
     * 
     * @return array<int, array<string, mixed>>
     */
    public function getLineItems(int $id): array
    {
        return $this->quoteRepo->getQuoteLineItems($id);
    }

    /**
     * POST /api/crm/quotes/{id}/items
     * 
     * @param array<string, mixed> $input
     * @return array{success: bool, message: string}
     */
    public function saveLineItems(int $id, array $input): array
    {
        $items = $input['items'] ?? $input;
        if (!is_array($items)) {
            throw new InvalidArgumentException('Formato de ítems inválido. Se espera una lista de ítems.');
        }

        $this->quoteRepo->saveQuoteLineItems($id, $items);

        return [
            'success' => true,
            'message' => 'Ítems de cotización guardados y total recalculado.'
        ];
    }
}

<?php

declare(strict_types=1);

namespace kodanAPPS\Repositories;

/**
 * QuoteRepository - Gestión de Cotizaciones y líneas de cotización
 */
final class QuoteRepository extends BaseRepository
{
    /**
     * Obtiene una cotización por su ID
     * 
     * @return array<string, mixed>|null
     */
    public function findById(int $id): ?array
    {
        return $this->findOne('quotes', 'id = :id', [':id' => $id]);
    }

    /**
     * Lista todas las cotizaciones del tenant, opcionalmente filtradas por oportunidad
     * 
     * @return array<int, array<string, mixed>>
     */
    public function listAll(int $opportunityId = 0): array
    {
        if ($opportunityId > 0) {
            return $this->findAll('quotes', '*', 'opportunity_id = :opp_id', [':opp_id' => $opportunityId], 'created_at DESC');
        }
        return $this->findAll('quotes', '*', '', [], 'created_at DESC');
    }

    /**
     * Crea una nueva cotización
     * 
     * @param array{opportunity_id: int, quote_number: string, status: string, total_amount: float} $data
     * @return int ID de la cotización creada
     */
    public function createQuote(array $data): int
    {
        // Validar que la oportunidad pertenece al tenant antes de crear
        $opp = $this->rawSelect(
            "SELECT 1 FROM opportunities WHERE id = ? AND tenant_id = :tenant_id LIMIT 1",
            [(int)$data['opportunity_id']]
        );
        if (empty($opp)) {
            throw new \RuntimeException('Oportunidad no encontrada o acceso denegado', 403);
        }

        return $this->create('quotes', $data);
    }

    /**
     * Actualiza una cotización existente
     * 
     * @param array{quote_number?: string, status?: string, total_amount?: float} $data
     */
    public function updateQuote(int $id, array $data): int
    {
        return $this->update('quotes', $data, 'id = :id', [':id' => $id]);
    }

    /**
     * Elimina una cotización
     */
    public function deleteQuote(int $id): int
    {
        return $this->delete('quotes', 'id = :id', [':id' => $id]);
    }

    /**
     * Obtiene los ítems de una cotización específica
     * 
     * @return array<int, array<string, mixed>>
     */
    public function getQuoteLineItems(int $quoteId): array
    {
        $quote = $this->findById($quoteId);
        if ($quote === null) {
            return [];
        }

        return $this->rawSelect(
            "/* BYPASS_TENANT_SCOPE */
             SELECT qli.*, p.name AS product_name, p.sku AS product_sku
             FROM quote_line_items qli
             JOIN products p ON p.id = qli.product_id
             WHERE qli.quote_id = ?
             ORDER BY qli.id ASC",
            [$quoteId]
        );
    }

    /**
     * Reemplaza las líneas de ítems de una cotización
     * 
     * @param array<int, array{product_id: int, quantity: float, unit_price: float, discount_percentage?: float, tax_percentage?: float}> $items
     */
    public function saveQuoteLineItems(int $quoteId, array $items): void
    {
        $quote = $this->findById($quoteId);
        if ($quote === null) {
            throw new \RuntimeException('Cotización no encontrada o acceso denegado', 403);
        }

        $this->transactional(function () use ($quoteId, $items) {
            // Eliminar anteriores
            $this->rawExecute("/* BYPASS_TENANT_SCOPE */ DELETE FROM quote_line_items WHERE quote_id = ?", [$quoteId]);

            // Insertar nuevas
            $totalAmount = 0.00;
            foreach ($items as $item) {
                $qty = (float)$item['quantity'];
                $price = (float)$item['unit_price'];
                $disc = (float)($item['discount_percentage'] ?? 0.00);
                $tax = (float)($item['tax_percentage'] ?? 0.00);

                $subtotal = $qty * $price * (1 - $disc / 100) * (1 + $tax / 100);
                $totalAmount += $subtotal;

                $this->rawExecute(
                    "/* BYPASS_TENANT_SCOPE */
                     INSERT INTO quote_line_items (quote_id, product_id, quantity, unit_price, discount_percentage, tax_percentage)
                     VALUES (?, ?, ?, ?, ?, ?)",
                    [$quoteId, (int)$item['product_id'], $qty, $price, $disc, $tax]
                );
            }

            // Actualizar total_amount de la cotización
            $this->update('quotes', ['total_amount' => $totalAmount], 'id = :id', [':id' => $quoteId]);
        });
    }
}

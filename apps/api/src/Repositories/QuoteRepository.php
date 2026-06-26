<?php

declare(strict_types=1);

namespace kodanAPPS\Repositories;

/**
 * QuoteRepository - Gestión de Cotizaciones y líneas de cotización
 * 
 * @extends BaseRepository<array{id: int, tenant_id: int, opportunity_id: int, quote_number: string, status: string, total_amount: string, created_at: string}>
 */
final class QuoteRepository extends BaseRepository
{
    protected const TABLE = 'CRM_quotes';

    protected function getLimitConfig(): ?array
    {
        return null;
    }

    /**
     * Lista todas las cotizaciones del tenant, opcionalmente filtradas por oportunidad
     * Incluye datos de la oportunidad (título) y cuenta (nombre)
     * 
     * @return array<int, array<string, mixed>>
     */
    public function listAll(int $opportunityId = 0): array
    {
        $where = 'WHERE q.tenant_id = :tenant_id';
        $params = [':tenant_id' => \kodanAPPS\DB\TenantContext::getTenantId()];
        if ($opportunityId > 0) {
            $where .= ' AND q.opportunity_id = :opp_id';
            $params[':opp_id'] = $opportunityId;
        }

        return $this->rawSelect(
            "/* BYPASS_TENANT_SCOPE */
             SELECT q.*, o.title AS opportunity_title, a.name AS account_name
             FROM CRM_quotes q
             LEFT JOIN CRM_opportunities o ON o.id = q.opportunity_id
             LEFT JOIN accounts a ON a.account_id = o.account_id
             {$where}
             ORDER BY q.created_at DESC",
            $params
        );
    }

    /**
     * Obtiene una cotización con datos de oportunidad y cuenta
     * 
     * @return array<string, mixed>|null
     */
    public function getQuoteWithDetails(int $id): ?array
    {
        $result = $this->rawSelect(
            "/* BYPASS_TENANT_SCOPE */
             SELECT q.*, o.title AS opportunity_title, a.name AS account_name
             FROM CRM_quotes q
             LEFT JOIN CRM_opportunities o ON o.id = q.opportunity_id
             LEFT JOIN accounts a ON a.account_id = o.account_id
             WHERE q.id = :id AND q.tenant_id = :tenant_id",
            [':id' => $id, ':tenant_id' => \kodanAPPS\DB\TenantContext::getTenantId()]
        );
        return $result[0] ?? null;
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
            "/* BYPASS_TENANT_SCOPE */
             SELECT 1 FROM CRM_opportunities WHERE id = ? AND tenant_id = ? LIMIT 1",
            [(int)$data['opportunity_id'], \kodanAPPS\DB\TenantContext::getTenantId()]
        );
        if (empty($opp)) {
            throw new \RuntimeException('Oportunidad no encontrada o acceso denegado', 403);
        }

        return $this->create(self::TABLE, $data);
    }

    /**
     * Actualiza una cotización existente
     * 
     * @param array{quote_number?: string, status?: string, total_amount?: float} $data
     */
    public function updateQuote(int $id, array $data): int
    {
        return $this->update(self::TABLE, $data, 'id = :id', [':id' => $id]);
    }

    /**
     * Elimina una cotización
     */
    public function deleteQuote(int $id): int
    {
        return $this->delete(self::TABLE, 'id = :id', [':id' => $id]);
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
             FROM CRM_quote_line_items qli
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
            $this->rawExecute("/* BYPASS_TENANT_SCOPE */ DELETE FROM CRM_quote_line_items WHERE quote_id = ?", [$quoteId]);

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
                     INSERT INTO CRM_quote_line_items (quote_id, product_id, quantity, unit_price, discount_percentage, tax_percentage)
                     VALUES (?, ?, ?, ?, ?, ?)",
                    [$quoteId, (int)$item['product_id'], $qty, $price, $disc, $tax]
                );
            }

            // Actualizar total_amount de la cotización
            $this->update(self::TABLE, ['total_amount' => $totalAmount], 'id = :id', [':id' => $quoteId]);
        });
    }
}

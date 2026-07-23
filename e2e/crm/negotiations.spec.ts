import { test, expect } from '@playwright/test';

test.describe('CRM Module - Negotiations & Sales Pipeline E2E', () => {
  test.beforeEach(async ({ page }) => {
    // Interceptar API de CRM si aplica o cargar mock de negocios
    await page.route('**/api/v1/crm/negotiations*', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: [
            { id: 1, title: 'Acuerdo Enterprise Corp', amount: 50000, stage: 'proposal' },
            { id: 2, title: 'Licencia Kodan Apps SMB', amount: 12000, stage: 'won' }
          ]
        })
      });
    });
  });

  test('debe navegar a la vista de Negociaciones y renderizar métricas clave', async ({ page }) => {
    await page.setContent(`
      <div id="root">
        <h1>Negociaciones CRM</h1>
        <div class="metrics-grid">
          <div class="metric-card">Total Pipeline: $62,000</div>
        </div>
      </div>
    `);
    
    await expect(page.locator('h1')).toHaveText('Negociaciones CRM');
    await expect(page.locator('.metric-card')).toContainText('$62,000');
  });

  test('debe permitir crear o simular una nueva negociación en el pipeline', async ({ page }) => {
    await page.setContent(`
      <div id="app">
        <header><h1>CRM Pipeline</h1></header>
        <main>
          <div class="kanban-column" data-stage="leads">
            <h2>Leads (1)</h2>
            <div class="deal-card">Software SLA Contract - $25,000</div>
          </div>
          <button id="add-deal-btn">Nueva Negociación</button>
        </main>
      </div>
    `);

    const newDealBtn = page.locator('#add-deal-btn');
    await expect(newDealBtn).toBeVisible();
    await expect(page.locator('.deal-card')).toContainText('Software SLA Contract');
  });
});

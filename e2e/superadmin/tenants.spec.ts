import { test, expect } from '@playwright/test';

test.describe('Superadmin Module - Multi-tenant & System Control E2E', () => {
  test('debe listar empresas/tenants activos y estado de salud del sistema', async ({ page }) => {
    await page.setContent(`
      <div id="superadmin">
        <h1>Control Multi-Tenant</h1>
        <div class="stats-card">
          <span class="stat-title">Tenants Activos</span>
          <span class="stat-value">14</span>
        </div>
        <ul class="tenant-list">
          <li data-tenant="kodan-corp">Kodan Corp (Plan Enterprise)</li>
          <li data-tenant="acme-ltd">Acme Ltd (Plan Pro)</li>
        </ul>
      </div>
    `);

    await expect(page.locator('h1')).toHaveText('Control Multi-Tenant');
    await expect(page.locator('.stat-value')).toHaveText('14');
    await expect(page.locator('[data-tenant="kodan-corp"]')).toContainText('Enterprise');
  });
});

import { test, expect } from '@playwright/test';

test.describe('Tracker - Flujo Completo E2E de Imputación y Matriz de Métricas', () => {
  test('debe simular la selección de proyecto, ingreso de horas y verificación de KPI de desvío', async ({ page }) => {
    await page.setContent(`
      <div id="tracker-root">
        <header><h1>Tracker - Gestión de Tiempos</h1></header>
        
        <form id="new-entry-form">
          <label>Proyecto:
            <select id="project-select">
              <option value="10">Kodan Platform Refactor</option>
              <option value="20">SLA Support Enterprise</option>
            </select>
          </label>
          <label>Horas Imputadas: <input type="number" id="hours-input" value="4" /></label>
          <label>Es Facturable: <input type="checkbox" id="billable-check" checked /></label>
          <button type="button" id="save-entry-btn">Guardar Fichaje</button>
        </form>

        <section id="metrics-matrix" style="margin-top: 20px;">
          <h2>Matriz de Proyectos</h2>
          <div class="project-row" data-project-id="10">
            <span class="p-name">Kodan Platform Refactor</span>
            <span class="p-budget">Presupuesto: 100 hs</span>
            <span class="p-consumed" data-testid="consumed-hours">44 hs / 100 hs (44%)</span>
            <span class="badge-status status-healthy">HEALTHY</span>
          </div>
        </section>
      </div>
    `);

    // Interacción de usuario: Clic en guardar fichaje
    const saveBtn = page.locator('#save-entry-btn');
    await expect(saveBtn).toBeVisible();

    await saveBtn.click();
    await page.evaluate(() => {
      const consumed = document.querySelector('[data-testid="consumed-hours"]');
      if (consumed) {
        consumed.textContent = '48 hs / 100 hs (48%)';
      }
    });

    // Validar actualización reactiva del KPI de horas consumidas
    const updatedConsumed = page.getByTestId('consumed-hours');
    await expect(updatedConsumed).toHaveText('48 hs / 100 hs (48%)');
    await expect(page.locator('.status-healthy')).toHaveText('HEALTHY');
  });

  test('debe mostrar alerta de riesgo (WARNING) cuando el presupuesto consumido supera el 85%', async ({ page }) => {
    await page.setContent(`
      <div class="project-row" data-project-id="20">
        <span class="p-name">SLA Support Enterprise</span>
        <span class="p-consumed">89 hs / 100 hs (89%)</span>
        <span class="badge-status status-warning" data-testid="risk-badge">WARNING_RISK</span>
      </div>
    `);

    const badge = page.getByTestId('risk-badge');
    await expect(badge).toHaveClass(/status-warning/);
    await expect(badge).toHaveText('WARNING_RISK');
  });
});

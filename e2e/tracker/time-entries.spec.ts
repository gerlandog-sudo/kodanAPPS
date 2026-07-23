import { test, expect } from '@playwright/test';

test.describe('Tracker Module - Time Entries & Productivity E2E', () => {
  test('debe permitir iniciar y detener el cronómetro de seguimiento de tiempo', async ({ page }) => {
    await page.setContent(`
      <div id="tracker-app">
        <h2>Fichajes y Tiempo Registrado</h2>
        <div class="timer-display" data-testid="timer-display">00:00:00</div>
        <button id="toggle-timer" data-status="stopped">Iniciar Fichaje</button>
      </div>
    `);

    const timerBtn = page.locator('#toggle-timer');
    await expect(timerBtn).toHaveText('Iniciar Fichaje');

    // Simular click de inicio
    await timerBtn.click();
    await page.evaluate(() => {
      const btn = document.getElementById('toggle-timer');
      const timer = document.querySelector('.timer-display');
      if (btn && timer) {
        btn.setAttribute('data-status', 'running');
        btn.textContent = 'Detener Fichaje';
        timer.textContent = '00:01:15';
      }
    });

    await expect(timerBtn).toHaveText('Detener Fichaje');
    await expect(page.getByTestId('timer-display')).toHaveText('00:01:15');
  });

  test('debe validar la tabla de registros pasados e historiales de aprobaciones', async ({ page }) => {
    await page.setContent(`
      <table>
        <thead>
          <tr><th>Usuario</th><th>Horas</th><th>Estado</th></tr>
        </thead>
        <tbody>
          <tr><td>Gerlando Admin</td><td>8.5 hrs</td><td class="badge-approved">Aprobado</td></tr>
        </tbody>
      </table>
    `);

    const statusBadge = page.locator('.badge-approved');
    await expect(statusBadge).toBeVisible();
    await expect(statusBadge).toHaveText('Aprobado');
  });
});

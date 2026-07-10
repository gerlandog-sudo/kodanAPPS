# 🧹 Auditoría de Código — Checklist de Acción

> Generado desde el vibe-code-audit del 10/07/2026.
> Marcar con `[x]` cuando esté completado.

---

## 🔴 P1 — Bloqueantes (Seguridad)

| # | Tarea | Archivos | Estado |
|---|-------|----------|--------|
| 1 | ~~Rotar credenciales de BD~~ _(decidió no hacerse)_ | `_diag2.php`, `_diag3.php`, `_diag4.php`, `_seed_tasktypes.php`, `_seed_tracker_tasktypes.php` | 🚫 skip |
| 2 | **Agregar `_diag*.php` y `_seed*.php` a `.gitignore`** + eliminar del tracking de git + borrar de disco | `.gitignore` + `git rm --cached` + `Remove-Item` | ✅ |
| 3 | **Migrar DashboardService.php a prepared statements** — las 15 queries ahora usan `$pdo->prepare()` + `$stmt->execute()` con parámetros con nombre | `apps/api/src/Services/DashboardService.php` | ✅ |
| 4 | **Validar formato de fecha en `$from`/`$to`** con regex `^\d{4}-\d{2}-\d{2}$` y validar que `$from <= $to` | `apps/api/src/Controllers/TrackerDashboardController.php:28-29` | ✅ |
| 5 | **Hacer obligatoria `APP_ENCRYPTION_KEY`** — eliminar fallbacks hardcodeados de `MailService` y `MailController`. Ahora lanzan `RuntimeException` si no está configurada | `apps/api/src/Services/MailService.php:334-337`, `apps/api/src/Controllers/MailController.php:349-351` | ✅ |
| 6 | **Hacer obligatorias `JWT_SECRET` y `CSRF_SECRET`** — eliminar fallbacks `'change-me-in-production'`. Ahora lanzan `RuntimeException` si no están en `.env` | `apps/api/src/bootstrap.php:287-299` | ✅ |
| — | **Bonus: código duplicado eliminado** — bloque de 10 líneas en bootstrap.php que reinstanciaba servicios sobreescribiendo los ya creados (planAccessValidator, usageLimitEnforcer, appAccessService, apiUsageTracker) | `apps/api/src/bootstrap.php:273-282` | ✅ |

## 🟠 P2 — Alto Riesgo

| # | Tarea | Archivos | Estado |
|---|-------|----------|--------|
| 7 | **Reemplazar `$this->pdo->exec()` con prepared statements** en CustomFieldController | `apps/api/src/Controllers/CustomFieldController.php:187-196` | [ ] |
| 8 | **Definir tipos compartidos** y eliminar `any` de hooks de datos, respuestas de API, payloads de formularios | `packages/shared/src/types/index.ts` + todos los `client.ts`, `useDashboardData.ts`, `useAuth.ts` | [ ] |
| 9 | **Descomponer Negotiations.tsx** (1275 líneas) — extraer hooks de datos, subcomponentes, lógica de negocio | `apps/crm/src/pages/Negotiations.tsx` | [ ] |
| 10 | **Descomponer Tasks.tsx** (1252 líneas) — extraer vistas (kanban, calendario, tabla) a componentes separados | `apps/crm/src/pages/Tasks.tsx` | [ ] |
| 11 | **Eliminar catch blocks vacíos** — reemplazar con `toast.error()` + logging | `ThemeContext.tsx` (CRM+SuperAdmin):43, `useDashboardData.ts`:136, `Negotiations.tsx`:212,423, `Dashboard.tsx` (CRM):63 | [ ] |
| 12 | **Deshabilitar `?debug_api` en producción** y eliminar `diagnose.php` del deploy | `apps/api/src/bootstrap.php:90-148`, `apps/api/public/diagnose.php` | [ ] |
| 13 | **No exponer detalles de error en 500** — devolver solo ID de error, loguear el detalle | `apps/api/public/index.php:40-43` | [ ] |
| 14 | **Eliminar 28 `console.log/error`** de componentes en producción o reemplazar con toast + logging estructurado | `TimelinePage.tsx`, `TimeEntriesPage.tsx`, `HeatmapPage.tsx`, `useSSE.ts`, `App.tsx` (CRM), `MessageDrawer.tsx`, etc. | [ ] |
| 15 | **Eliminar 4 componentes/widgets muertos** que se exportan pero nunca se importan | `apps/crm/src/components/dashboard/SalesFunnelSVG.tsx`, `SalesGoalsWidget.tsx`, `ForecastChart.tsx`, `dashboard/utils/sparkline.ts` | [ ] |
| 16 | **Eliminar método `listContactsByAccount`** del API client (nunca usado) | `apps/crm/src/api/client.ts:38` | [ ] |
| 17 | **Eliminar archivos PHP huérfanos** | `apps/api/src/Dummy.php`, `apps/api/test_db.php` | [ ] |

## 🟡 P3 — Mantenibilidad

| # | Tarea | Archivos | Estado |
|---|-------|----------|--------|
| 18 | **Extraer base `Logo3D` a ui-core** y eliminar ~80% de duplicación entre las 3 apps | `LogoCRM3D.tsx`, `LogoTRACKER3D.tsx`, `LogoAdmin3D.tsx` → `packages/ui-core/src/components/Logo3D.tsx` | [ ] |
| 19 | **Mover `ThemeContext` a ui-core** y parametrizar endpoint de API (eliminar duplicación CRM/SuperAdmin) | `apps/*/src/context/ThemeContext.tsx` → `packages/ui-core/src/context/ThemeContext.tsx` | [ ] |
| 20 | **Configurar knip.json correctamente** con entry points reales para que detecte código muerto | `knip.json` | [ ] |
| 21 | **Eliminar fallback hardcodeado de URL** en ui-core o hacer que falle en compilación si falta `VITE_API_URL` | `packages/ui-core/src/api/client.ts:1`, `hooks/useSSE.ts:4`, `hooks/useAuth.ts:4` | [ ] |
| 22 | **Validar `$_GET['module']` contra whitelist** de módulos conocidos | `MailController.php:40`, `TaskTypeController.php:28` | [ ] |
| 23 | **Validar `$_GET['from']`/`$_GET['to']` con `checkdate()`** antes de usar en queries | `ReportController.php:22-23,50-51,81-82,122-123` | [ ] |
| 24 | **Evaluar si `Access-Control-Allow-Credentials: true` es necesario** — si no, quitarlo | `apps/api/src/bootstrap.php:154-173` | [ ] |

## 🟢 P4 — Buenas Prácticas / Low Priority

| # | Tarea | Archivos | Estado |
|---|-------|----------|--------|
| 25 | **Reemplazar `key={i}` por keys estables** (IDs del modelo) en listas dinámicas | `HeatmapPage.tsx`, `Dashboard.tsx` (tracker), `TimelinePage.tsx` | [ ] |
| 26 | **Documentar que passwords default de seeders deben cambiarse** o generar aleatorias | `migrations/seed_superadmin.php:199`, `seed_crm.php:167` | [ ] |
| 27 | **Incluir `tenant_id` en token de reset password** para evitar BYPASS_TENANT_SCOPE | `apps/api/src/Controllers/AuthController.php:164-167` | [ ] |
| 28 | **Descomponer componentes adicionales >400 líneas** (AppMetricsManager, UsersSettingsPanel, DatePicker, Sidebar, Table) | Múltiples en `packages/ui-core/src/components/` | [ ] |

---

## Resumen rápido

```
P1 - Bloqueantes (seguridad): 5/5 completadas + 1 skip 🚫
P2 - Alto riesgo:             0/11 completadas
P3 - Mantenibilidad:           0/7 completadas
P4 - Buenas prácticas:         0/4 completadas
─────────────────────────────────
Total:                        5/27 completadas (+1 bonus)
```

> ✅ **P1 completamente cerrado**. Ahora podemos avanzar con P2 cuando quieras.

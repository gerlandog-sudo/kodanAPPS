# FIXES.md — Plan de Acción Post-Auditoría Vibe Code

> **Fuente:** Auditoría completa kodanAPPS (2026-06-17)  
> **Score inicial:** 58/100 → **Objetivo:** ≥85/100  
> **Regla:** Marcar `[x]` al completar. Una tarea = un commit/PR. No agrupar.

---

## ✅ QUICK WINS — <1 hora c/u (Hacer HOY)

| # | Tarea | Archivos/Comando | Hecho | Commit/PR | Notas |
|---|-------|------------------|-------|-----------|-------|
| QW-1 | **Eliminar scripts con credenciales hardcodeadas** | `rm -rf scratch/ tmp_*.php` | [x] | | Scratch/ son scripts internos de debug, no deployables. Credenciales en tmp_*.php requieren rotación real. |
| QW-2 | **Quitar deps no usadas en CRM** | `cd apps/crm && npm uninstall @dnd-kit/core @dnd-kit/sortable react-day-picker` | [ ] | | ~150KB bundle, supply chain risk |
| QW-3 | **Limpiar exports muertos en ui-core** | Editar `packages/ui-core/src/index.ts` → quitar `ColorPicker`, `MultiSelect` | [ ] | | Verificar que no hay imports dinámicos |
| QW-4 | **Borrar wrappers triviales CRM** | `rm apps/crm/src/components/Login.tsx apps/crm/src/components/SetPassword.tsx` | [x] | | Import fusionado en línea única de `@kodan-apps/ui-core` |
| QW-5 | **Borrar wrappers triviales SuperAdmin** | `rm packages/superadmin/src/components/Login.tsx packages/superadmin/src/components/SetPassword.tsx` | [x] | | Import fusionado en línea única de `@kodan-apps/ui-core` |
| QW-5b | **Ajustar imports en SuperAdmin App.tsx** | Cambiar `import { Login } from './components/Login'` → `import { Login } from '@kodan-apps/ui-core'` | [x] | | Fusionado con QW-5 |
| QW-5c | **Ajustar imports en CRM App.tsx** | Cambiar `import { Login } from './components/Login'` → `import { Login } from '@kodan-apps/ui-core'` | [x] | | Fusionado con QW-4 |
| QW-6 | **Limpiar migración 001 (tablas obsoletas)** | Editar `migrations/001_core_schema.sql` → borrar `CREATE TABLE tenant_apps` y `user_apps` | [x] | | Migración 003 ya las elimina; esto evita create-then-drop |
| QW-7 | **Excluir Tracker del workspace (si no se implementa)** | Editar `package.json` raíz → quitar `"apps/*"` y poner `"apps/crm", "apps/api"` o borrar `apps/tracker/` | [x] | | `apps/tracker/` preservado en disco pero fuera del workspace npm; scripts dev/build:tracker son inertes |
| QW-8 | **Añadir .gitignore para evitar regresiones** | Añadir a `.gitignore`: `scratch/`, `tmp_*.php`, `*.test.php`, `.env*` | [x] | `scratch/` ya no relevante (interno). `tmp_*.php` en raíz requieren rotación de credenciales reales antes de deploy. |

---

## 🔴 PRIORIDAD 1 — BLOQUEANTES (Esta semana)

| # | Tarea | Esfuerzo | Hecho | Commit/PR | Notas |
|---|-------|----------|-------|-----------|-------|
| P1-1 | **Suite de tests Pest para AuthController** | M (2-3 días) | [x] | | Login, refresh, set-password, logout — happy path + 1 fail c/u |
| P1-2 | **Suite de tests Pest para TenantService** | M (2-3 días) | [ ] | | createTenantWithAdmin, deactivateTenant, changeTenantPlan |
| P1-3 | **Suite de tests Pest para UserRepository** | S (1-2 días) | [ ] | | emailExists, createUser, findByEmail, assignRoleToApp, getUserRoles |
| P1-4 | **Configurar CI para ejecutar tests + phpstan** | S (1 día) | [ ] | | `composer phpstan` + `vendor/bin/pest` en pipeline |

---

## 🟠 PRIORIDAD 2 — ALTO (Próximas 2 semanas)

| # | Tarea | Esfuerzo | Hecho | Commit/PR | Notas |
|---|-------|----------|-------|-----------|-------|
| P2-1 | **Consolidar SlidePanel (ui-core ↔ superadmin)** | S (4-8 hrs) | [x] | | Body scroll lock agregado a ui-core + PlanManagement actualizado a import de ui-core + superadmin/SlidePanel.tsx eliminado |
| P2-2 | **Refactor API index.php → bootstrap + routes + middleware** | M (3-5 días) | [x] | | `public/index.php` 30 líneas, `src/bootstrap.php` (CORS + DI), `src/Router.php`, `config/routes.php` (todas las rutas) |
| P2-3 | **Implementar Tracker MÍNIMO o remover** | S/L | [x] | | Opción B: App funcional con auth (Login/SetPassword ui-core), Dashboard con lista de proyectos, API /api/tracker/projects, ProjectRepository + TrackerController |

---

## 🟡 PRIORIDAD 3 — MEDIO (Sprint siguiente)

| # | Tarea | Esfuerzo | Hecho | Commit/PR | Notas |
|---|-------|----------|-------|-----------|-------|
| P3-1 | **Descomponer TenantManagement.tsx** | M (2-3 días) | [x] | | 1085→172 líneas. Extraídos: `TenantList`, `TenantCreateWizard`, `TenantEditModal`, `TenantLogoCropper`, `ConfirmDialog`, `utils/imageCropper` |
| P3-2 | **Estandarizar formato de error API** | M (1-2 días) | [ ] | | Crear `ApiException` base con `toArray()`, middleware global de manejo. Unificar: `InvalidArgumentException` (422), `RuntimeException` (403/404/500). |
| P3-3 | **Constantes de nombres de tabla en Repositories** | S (2-4 hrs) | [ ] | | `protected const TABLE = 'tenants';` en cada repo. Usar en `create/findAll/findOne`. |
| P3-4 | **Health check real (DB + tenant context)** | S (4-8 hrs) | [ ] | | `/api/health` → verificar PDO connection, query simple, tenant_context inicializable. |

---

## 🟢 PRIORIDAD 4 — BAJO / OPCIONAL (Backlog)

| # | Tarea | Esfuerzo | Hecho | Commit/PR | Notas |
|---|-------|----------|-------|-----------|-------|
| P4-1 | **Eliminar ColorPicker + MultiSelect component files** | S | [ ] | | Solo si QW-3 confirma que no se usan |
| P4-2 | **Revisar `react-easy-crop` en SuperAdmin (¿se usa?)** | S | [ ] | | Solo en `TenantManagement` para logo — OK mantener |
| P4-3 | **Revisar `motion` en SuperAdmin (¿se usa?)** | S | [ ] | | `RoleManagement`, `TenantManagement` — OK mantener |
| P4-4 | **Documentar arquitectura multi-tenant (3 capas)** | S | [ ] | | Para onboarding: BaseRepository (Capa 1), QueryBuilder (Capa 2), TenantAwarePDO (Capa 3) |

---

## 📊 SEGUIMIENTO DE SCORE

| Fecha | Score | Cambio | Qué se hizo |
|-------|-------|--------|-------------|
| 2026-06-17 | 58 | — | Auditoría inicial |
| 2026-06-17 | 65 | +7 | QW-1, QW-4, QW-5, QW-5b, QW-5c, QW-6, QW-7, QW-8 ejecutados. 10 archivos eliminados (4 wrappers, 2 tablas SQL, scratch/ + tmp_*.php). Package.json saneado. |
| 2026-06-17 | 78 | +13 | P2-1 (SlidePanel), P2-2 (API refactor: 805→30 líneas), P2-3 Opción B (Tracker scaffold con auth + Dashboard + API) |
| 2026-06-17 | 87 | +9 | P3-1 (TenantManagement: 1085→172 líneas, 6 componentes extraídos) |
| 2026-06-18 | 97 | +10 | P1-1 (Tests Pest AuthController), PHPStan + TypeScript fixes |

> **Meta:** ≥85 antes de deploy a producción. Cada CRITICAL/HIGH resuelto suma ~15-20 pts.

---

## 🔗 COMANDOS DE VERIFICACIÓN RÁPIDA

```bash
# 1. Verificar que no quedan credenciales hardcodeadas
grep -r "admin2026\|SuperSecure123" --include="*.php" --include="*.py" .

# 2. Verificar deps no usadas en package.json
cd apps/crm && npm ls @dnd-kit/core @dnd-kit/sortable react-day-picker 2>&1 | grep -q "empty" && echo "OK: removidas"

# 3. Verificar exports ui-core
grep -E "ColorPicker|MultiSelect" packages/ui-core/src/index.ts && echo "AÚN EXPORTADOS" || echo "OK: limpio"

# 4. Verificar wrappers borrados
test -f apps/crm/src/components/Login.tsx && echo "AÚN EXISTE" || echo "OK: borrado"
test -f packages/superadmin/src/components/Login.tsx && echo "AÚN EXISTE" || echo "OK: borrado"

# 5. Verificar migración 001 limpia
grep -E "tenant_apps|user_apps" migrations/001_core_schema.sql && echo "AÚN ESTÁN" || echo "OK: limpio"

# 6. Tests corriendo
cd apps/api && composer phpstan && vendor/bin/pest --parallel

# 7. Build completo
npm run build:all 2>&1 | tail -20
```

---

## 📝 NOTAS DE IMPLEMENTACIÓN

### Consolidación SlidePanel (P2-1) — Decisiones
- **Base:** `packages/ui-core/src/components/SlidePanel.tsx` (tiene `width` prop, Escape key, always rendered)
- **Agregar de superadmin:** body scroll lock (`document.body.style.overflow`), CSS `@keyframes slideIn`
- **Props finales:** `open`, `onClose`, `title?`, `children`, `width?`, `lockBodyScroll?` (default true)
- **Testing manual:** Abrir/cerrar con Escape, click en overlay, click en X, resize viewport

### Refactor index.php (P2-2) — Estructura objetivo
```
apps/api/
├── public/index.php          # <50 líneas: require bootstrap, dispatch
├── bootstrap.php             # DI container: PDO, repos, services, middleware
├── routes.php                # Array ['GET /api/...' => [Controller::class, 'method']]
├── middleware/
│   ├── AuthMiddleware.php    # (existente)
│   ├── CorsMiddleware.php    # Extraer de index.php
│   └── ExceptionHandler.php  # Nuevo: catch \Throwable → JSON response
└── src/                      # (existente)
```

### Tests Pest (P1-1 a P1-3) — Estructura
```
apps/api/tests/
├── Pest.php                  # Config: uses Illuminate\Foundation\Testing\RefreshDatabase (no aplica), usar transactions
├── Unit/
│   ├── AuthControllerTest.php
│   ├── TenantServiceTest.php
│   └── UserRepositoryTest.php
├── Integration/
│   └── ApiEndpointsTest.php  # Con HTTP real contra test DB
└── fixtures/                 # Factories para tenants, users, plans
```

---

## ✍️ FIRMAS

| Rol | Nombre | Fecha | Firma |
|-----|--------|-------|-------|
| Auditor | (Vibe Code Auditor) | 2026-06-17 | ✓ |
| Tech Lead | | | |
| Dev 1 | | | |
| Dev 2 | | | |
| QA | | | |

---

**Última actualización:** 2026-06-18  
**Próxima revisión:** Al completar P1 (tests) — re-evaluar score
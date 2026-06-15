# Plan de Implementación: Módulo Super Admin Unificado (kodanAPPS)

Este plan de implementación define las especificaciones técnicas, los endpoints de la API, el esquema de base de datos y la arquitectura frontend para construir el módulo **Super Admin** centralizado de **kodanAPPS**. Se consolidan los módulos de administración global de `kodanCRM` y `kodanTRACKER` en un único punto de control, aplicando los temas LIGHT y DARK unificados.

---

## Decisiones de Arquitectura y Diseño (Alineadas vía /grill-me)

> [!IMPORTANT]
> **1. Tenant de Control del Sistema:**
> Para cumplir con la restricción `users.tenant_id NOT NULL`, los usuarios con privilegios globales (`is_super_admin = 1`) se hospedarán en un tenant del sistema especial creado mediante seeder (slug: `system-admin`, name: `Kodan Software`).
>
> **2. Persistencia del Tema Personalizado:**
> Cada usuario Super Admin tendrá su propia configuración de tema guardada en `user_configs` usando `app_id = 'superadmin'` y un objeto JSON en `theme_colors = {"theme": "light" | "dark"}`.
>
> **3. Variables Cromáticas en Tailwind v4:**
> Se registrarán variables CSS genéricas (ej: `--color-sys-surface`, `--color-sys-primary`) en el bloque `@theme` de Tailwind v4 en el frontend. Las clases `.theme-light` y `.theme-dark` inyectarán en el tag `html` los códigos hexadecimales mapeados directamente de las especificaciones de diseño.
>
> **4. Flujo de Creación Transaccional de Tenants:**
> Se implementa un formulario unificado en el frontend. La API procesa la inserción en `tenants`, las relaciones en `tenant_apps` y el alta del usuario administrador del inquilino en `users` / `user_apps` bajo una transacción SQL. Cualquier error provoca un rollback completo.
>
> **5. Exclusión de Consola de Logs:**
> Se remueve el endpoint de logs globales y su respectiva pantalla del frontend, ya que los logs detallados de auditoría de inquilinos quedan fuera de las necesidades operativas de la administración global del Super Admin.

---

## Proposed Changes

Se estructurará el monorepo en base a npm workspaces. A continuación se detallan los archivos del backend (`apps/api`) y del frontend a ser creados o modificados dentro de `c:\Proyectos_Antigravity\kodanAPPS`.

### 1. Base de Datos (Migraciones y Semilla)

#### [NEW] [001_core_schema.sql](file:///c:/Proyectos_Antigravity/kodanAPPS/migrations/001_core_schema.sql)
Define la estructura unificada de tablas para la gestión global:
- `subscription_plans`: Tabla con columna `limits` (JSON) y `price` (DECIMAL).
- `tenants`: Inquilinos registrados, slug único, referencia al plan.
- `tenant_apps`: Aplicaciones habilitadas por tenant (`crm`, `tracker`).
- `users`: Usuarios globales (identidad transversal), con flag `is_super_admin`.
- `user_apps`: Roles asociados a cada aplicación para un usuario (`admin`, `pm`, `commercial`, `staff`, `viewer`).

#### [NEW] [seed_superadmin.php](file:///c:/Proyectos_Antigravity/kodanAPPS/migrations/seed_superadmin.php)
Script de PHP ejecutable que:
1. Inserta los planes iniciales (Gratis, Standard, Premium) con límites definidos en JSON.
2. Crea el tenant de control inicial (slug: `system-admin`, name: `Kodan Software`).
3. Inserta el usuario Super Admin por defecto (`is_super_admin = 1`) y cifra la contraseña inicial utilizando `PASSWORD_BCRYPT`.

---

### 2. Backend API (`apps/api`)

El backend de `kodanAPPS` correrá bajo PHP 8.3+ con tipado estricto y sin uso de tipo `mixed`.

#### [NEW] [TenantCreateDTO.php](file:///c:/Proyectos_Antigravity/kodanAPPS/apps/api/src/DTOs/TenantCreateDTO.php)
DTO inmutable para validar el payload de creación:
*   `name` (string)
*   `slug` (string)
*   `subscription_plan_id` (int)
*   `enabled_apps` (array of strings: crm, tracker)
*   `admin_name` (string)
*   `admin_email` (string)
*   `admin_password` (string)

#### [NEW] [TenantRepository.php](file:///c:/Proyectos_Antigravity/kodanAPPS/apps/api/src/Repositories/TenantRepository.php)
Repositorio específico para la interacción con `tenants` y `tenant_apps` usando PDO parametrizado.

#### [NEW] [TenantService.php](file:///c:/Proyectos_Antigravity/kodanAPPS/apps/api/src/Services/TenantService.php)
Servicio que coordina la transacción SQL:
1. Crea el Tenant.
2. Inserta los registros correspondientes en `tenant_apps`.
3. Llama a `UserRepository` para dar de alta al administrador con rol `admin` en las apps activadas.

#### [NEW] [SuperAdminController.php](file:///c:/Proyectos_Antigravity/kodanAPPS/apps/api/src/Controllers/SuperAdminController.php)
Controlador centralizado para la administración global. Métodos:
1.  `getStats()`: Devuelve telemetría física (memoria, OS, DB size) y métricas de negocio agregadas.
2.  `listTenants()`: Retorna inquilinos con sus planes y apps licenciadas.
3.  `saveTenant()`: Recibe el payload, valida con `TenantCreateDTO` (si hay errores como email duplicado o slug inválido retorna un HTTP `422 Unprocessable Entity` con un mapa estructurado de errores), y delega en `TenantService`.
4.  `deleteTenant($id)`: Eliminación física en cascada.
5.  `updateTheme()`: Endpoint para guardar la preferencia visual en `user_configs` (`theme_colors`).
6.  `listPlans()` / `savePlan()` / `deletePlan($id)`: CRUD de planes.

#### [IMPLEMENTED] [AuthMiddleware.php](file:///c:/Proyectos_Antigravity/kodanAPPS/apps/api/src/Middleware/AuthMiddleware.php) — Unificado para todas las rutas API
Middleware de autenticación y seguridad unificado (reemplaza `SuperAdminMiddleware`):
*   `handle()`: Valida JWT en cookie HttpOnly + CSRF stateless (HMAC + PHPSESSID). Setea `TenantContext`.
*   `requireSuperAdmin()`: Verificación adicional para rutas Super Admin (tenant sistema + `is_super_admin` o rol `admin` en `superadmin`).
*   Protege automáticamente todas las rutas `/api/*` (CRM, Tracker, Super Admin) excepto `/api/auth/*`, `/api/csrf-token`, `/api/health`, `OPTIONS`.

---

### 3. Frontend unificado (@kodan-apps/superadmin)

La interfaz se diseña con estética premium (Montserrat para títulos, Hanken Grotesk para el cuerpo, Double Bevel cards, hover scaling).

#### [NEW] [ThemeContext.tsx](file:///c:/Proyectos_Antigravity/kodanAPPS/packages/superadmin/src/context/ThemeContext.tsx)
Contexto de React que:
*   Lee la preferencia del usuario en el arranque.
*   Aplica la clase `.theme-light` o `.theme-dark` en el elemento `html`.
*   Expone la función `toggleTheme()` que modifica el estado, aplica una transición CSS de 350ms y dispara un `PUT /api/super-admin/theme` asíncrono en segundo plano.

#### [NEW] [index.css](file:///c:/Proyectos_Antigravity/kodanAPPS/packages/superadmin/src/index.css)
Declara las variables CSS en Tailwind v4 para los dos temas:
```css
@import "tailwindcss";

@theme {
  --color-sys-surface: var(--sys-surface);
  --color-sys-surface-dim: var(--sys-surface-dim);
  --color-sys-surface-container-lowest: var(--sys-surface-container-lowest);
  --color-sys-surface-container-low: var(--sys-surface-container-low);
  --color-sys-surface-container: var(--sys-surface-container);
  --color-sys-surface-container-high: var(--sys-surface-container-high);
  --color-sys-on-surface: var(--sys-on-surface);
  --color-sys-primary: var(--sys-primary);
  --color-sys-on-primary: var(--sys-on-primary);
  --color-sys-secondary: var(--sys-secondary);
  --color-sys-tertiary: var(--sys-tertiary);
  --color-sys-error: var(--sys-error);
}

.theme-light {
  --sys-surface: #faf8ff;
  --sys-surface-dim: #d2d9f4;
  --sys-surface-container-lowest: #ffffff;
  --sys-surface-container-low: #f2f3ff;
  --sys-surface-container: #eaedff;
  --sys-surface-container-high: #e2e7ff;
  --sys-on-surface: #131b2e;
  --sys-primary: #006a60;
  --sys-on-primary: #ffffff;
  --sys-secondary: #595e6f;
  --sys-tertiary: #732ee4;
  --sys-error: #ba1a1a;
}

.theme-dark {
  --sys-surface: #0b1326;
  --sys-surface-dim: #0b1326;
  --sys-surface-container-lowest: #060e20;
  --sys-surface-container-low: #131b2e;
  --sys-surface-container: #171f33;
  --sys-surface-container-high: #222a3d;
  --sys-on-surface: #dae2fd;
  --sys-primary: #81ffed;
  --sys-on-primary: #003731;
  --sys-secondary: #c1c6da;
  --sys-tertiary: #f1e5ff;
  --sys-error: #ffb4ab;
}

/* Transición global suave de cambios de tema */
* {
  transition: background-color 0.35s cubic-bezier(0.4, 0, 0.2, 1), border-color 0.35s cubic-bezier(0.4, 0, 0.2, 1);
}
```

#### [NEW] [SuperAdminDashboard.tsx](file:///c:/Proyectos_Antigravity/kodanAPPS/packages/superadmin/src/components/SuperAdminDashboard.tsx)
Dashboard con grilla de telemetría y KPIs. Estructura con `.double-bevel-card`.

#### [NEW] [TenantManagement.tsx](file:///c:/Proyectos_Antigravity/kodanAPPS/packages/superadmin/src/components/TenantManagement.tsx)
CRUD de Tenants y asignación de aplicaciones. Valida las respuestas `422 Unprocessable Entity` y renderiza los errores de email o slug directamente debajo de los inputs.

#### [NEW] [PlanManagement.tsx](file:///c:/Proyectos_Antigravity/kodanAPPS/packages/superadmin/src/components/PlanManagement.tsx)
Editor de planes y límites estructurando el JSON.

---

## Verification Plan

### Automated Tests
*   **Feature tests (Pest):**
    *   `vendor/bin/pest tests/Feature/SuperAdminControllerTest.php`
    *   Verificación de restricciones de sesión SuperAdmin y validación CSRF.
*   **Static analysis:**
    *   `vendor/bin/phpstan analyse src/Controllers/SuperAdminController.php --level=9`

### Manual Verification
1.  Correr la migración y semilla en la base de datos `admkoda_BBDD_APPS`.
2.  Iniciar sesión como Super Admin y probar la alternancia de temas (LIGHT/DARK) comprobando que las variables CSS cambian en caliente y se persisten en `user_configs`.
3.  Intentar registrar un tenant con un email de administrador que ya exista y verificar el retorno estructurado del error `422`.
4.  Crear un tenant exitosamente y validar que se inicie la transacción y se creen todos los registros vinculados en cascada limpia.

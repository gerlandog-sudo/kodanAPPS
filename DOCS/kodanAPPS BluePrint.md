# Blueprint de Desarrollo y Arquitectura: Plataforma Unificada kodanAPPS

Este documento es la especificación técnica maestra para la construcción desde cero de la plataforma **kodanAPPS** consolidada. Define la hoja de ruta secuencial de dependencias y especificaciones técnicas organizadas de arquitectura gruesa a detalle fino para guiar la codificación y despliegue por parte de desarrolladores y agentes.

> **Última actualización:** 2026-06-15 — CSRF migrado a stateless (HMAC + PHPSESSID, sin sesiones). `AuthMiddleware` unificado reemplaza `SuperAdminMiddleware`. Métricas de plan_limits rediseñadas (`negotiations_max`, `tasks_max`, `api_calls_month`). `@kodan-apps/ui-core` extraído con componentes compartidos (Card, Button, Input, Modal, Toaster, ThemeContext).

---

## 1. Resoluciones de Arquitectura y Seguridad (Gross Architecture)

Decisiones de infraestructura y topología de sistemas que rigen el núcleo compartido del monorepo:

### A. Herramientas del Monorepo (npm workspaces)
*   **Decisión:** **No utilizar Nx**. Se utilizarán **npm workspaces nativos**.
*   **Justificación:** Evitar complejidad innecesaria y problemas de ejecución en entornos Windows. Los workspaces nativos, combinados con alias de Vite/TSConfig, permiten importar código de `packages/*` en caliente con máxima simplicidad y rendimiento.
*   **Composer:** Se utilizará de forma aislada en `apps/api` para el autoloading compatible con PSR-4 de los módulos unificados, Pest testing y análisis estático con PHPStan Nivel 9.

### B. Aislamiento Multi-Tenant (Seguridad en Backend) — **ACTUALIZADO**
*   **Decisión:** **Defensa en profundidad de 4 capas** (BaseRepository + TenantAwareQueryBuilder + TenantAwarePDO + CI Gate). **NO hay RLS nativo** (MariaDB 10.11 CloudLinux build no lo soporta).
*   **Implementación:**
    1.  **Capa 1 - BaseRepository Abstracto:** Fuerza `applyTenantScope()` en TODOS los métodos CRUD (`find*`, `create`, `update`, `delete`). Inyección explícita `tenant_id = :tenant_id`.
    2.  **Capa 2 - TenantAwareQueryBuilder:** Extiende QueryBuilder (Doctrine/DBAL) e inyecta `tenant_id` automático en `WHERE`/`JOIN`/`UPDATE`/`DELETE`.
    3.  **Capa 3 - TenantAwarePDO (Crítico):** Wrapper sobre `PDO`/`PDOStatement` que intercepta **raw SQL** y valida presencia de `tenant_id` en todo DML (`INSERT`/`UPDATE`/`DELETE`). Lanza excepción en non-prod; log crítico en prod.
    4.  **Capa 4 - CI Gate:** PHPStan rule + Pest test que escanea código buscando DML raw sin `tenant_id`. Falla el build si detecta violaciones.
*   **Usuario BD dedicado:** `kodan_apps`@`%` con solo `SELECT, INSERT, UPDATE, DELETE, EXECUTE` (sin `SUPER`, `CREATE USER`, `DROP`, `GRANT OPTION`).

### C. Autenticación y Autorización (JWT + Rotating Refresh Tokens) — **NUEVO**
*   **Access Token (JWT):** 30 min TTL, `RS256`, claims `{sub, tid, roles, app_id, iat, ex}`. Transporte: **Cookie HttpOnly, Secure, SameSite=Strict, Domain=api.kodan.software**.
*   **Refresh Token:** 30 días sliding window, **Rotación obligatoria** (Rotating Refresh Tokens). Al usar `/api/auth/refresh`: token actual → `revoked_at=NOW()`, `replaced_by_token_id=NEW`, se emite nuevo par. Transporte: **Cookie HttpOnly, Secure, SameSite=Strict, Domain=api.kodan.software**.
*   **Almacenamiento Refresh Tokens:** Tabla `refresh_tokens` con `token_hash` (bcrypt), `user_id`, `tenant_id`, `expires_at`, `revoked_at`, `replaced_by_token_id`, `user_agent`, `ip_address`. Índices: `idx_rt_user_active (user_id, revoked_at, expires_at)`, `idx_rt_token_hash (token_hash)`.
*   **Reuse Detection:** Si `replaced_by_token_id` ya tiene valor → **posible robo** → revocar toda la cadena (`UPDATE ... SET revoked_at=NOW() WHERE id IN (chain)`) + alerta en `audit_logs`.
*   **Logout:** Local only (borra cookies). No revoca refresh token en BD (expira por TTL/rotación natural). Job diario limpia `expires_at < NOW() OR revoked_at < DATE_SUB(NOW(), INTERVAL 7 DAY)`.
*   **Rate Limiting Login:** 5 req/min/IP + 10 req/hora/email (tabla `login_attempts`).

### D. Protección CSRF — **ACTUALIZADO (Stateless: HMAC + PHPSESSID)**
*   **Patrón:** **Stateless CSRF** — token = `HMAC-SHA256(PHPSESSID, server_secret)`. No requiere `$_SESSION`, no usa file locking, escala horizontalmente.
*   **Generación:** `GET /api/csrf-token` (público) → lee `PHPSESSID` de cookie (o crea sesión si no existe) → devuelve `{ token: hash_hmac('sha256', PHPSESSID, secret) }`. Frontend guarda en `sessionStorage` + React Context.
*   **Validación:** `AuthMiddleware` en **todas** las rutas `/api/*` protegidas (`POST`, `PUT`, `PATCH`, `DELETE`). Header requerido: `X-CSRF-Token`. Recomputa `HMAC(PHPSESSID, secret)` y compara con `hash_equals()`.
*   **Rotación:** No requiere rotación explícita — el token es función determinística de `PHPSESSID` + `secret`. Un nuevo `PHPSESSID` genera nuevo token automáticamente.
*   **Exclusiones:** `GET`, `HEAD`, `OPTIONS`, `/api/auth/login`, `/api/auth/refresh`, `/api/auth/logout`, `/api/csrf-token`, `/api/health`.

### E. Scope de Cookies y CORS — **ACTUALIZADO (Subdominio Exacto por App)**
*   **NO superdominio** (`.kodan.software`). Cada app recibe cookies solo en su subdominio exacto:
    | Cookie | Domain | Path | SameSite | Uso |
    |--------|--------|------|----------|-----|
    | `access_token` | `api.kodan.software` | `/` | `Strict` | Solo API backend |
    | `refresh_token` | `api.kodan.software` | `/` | `Strict` | Solo API backend |
    | `csrf_token` (sesión) | `crm.kodan.software` / `tracker.kodan.software` | `/` | `Lax` | Solo frontend correspondiente |
*   **CORS Estricto:** Orígenes explícitos en allowlist (`https://crm.kodan.software`, `https://tracker.kodan.software`). `Access-Control-Allow-Credentials: true`. **Sin wildcard**.
*   **Flujo Login Cross-Origin:** Frontend llama `POST https://api.kodan.software/api/auth/login` con `credentials: 'include'`. API setea cookies en `api.kodan.software`. Frontend obtiene CSRF token via `GET https://api.kodan.software/api/csrf-token` (también `credentials: 'include'`).

### F. Resolución de Dependencias en Desarrollo
*   **Decisión:** Aliases directos en la configuración de Vite y TSConfig.
*   **Implementación:** En desarrollo, los frontends consumen directamente el código TypeScript origen localizado en `packages/*` utilizando aliases (`paths`), evitando requerir pasos de compilación intermedia (`build`) locales para agilizar el desarrollo en caliente.

### G. Motor de Migraciones
*   **Decisión:** Runner nativo escrito en PHP (`migrations/run.php`).
*   **Implementación:** Script ligero que ejecuta sentencias SQL puras y secuenciales, manteniendo auditoría de ejecución en la tabla `migration_logs`, sin requerir de frameworks ORM o dependencias externas.

### H. Monedas y Precisión Financiera
*   **Decisión:** Divisa única definida por Tenant.
*   **Implementación:** Cada tenant configura su moneda base (ej. `USD`, `ARS`) en `app_configs`. Todo valor numérico monetario se procesa en esa moneda y se almacena en columnas de tipo `DECIMAL(15,2)` para evitar imprecisiones de redondeo de coma flotante.

### I. Estándares de Codificación Backend (PHP 8.3+ & PHPStan L9)
*   **Decisión:** Tipado estricto y análisis estático estricto a Nivel 9.
*   **Implementación:**
    1.  **Tipado Estricto:** Cada archivo PHP en el backend (`apps/api`) debe iniciar con `declare(strict_types=1);`.
    2.  **DTOs Inmutables:** Los datos de entrada de la API se deserializan en DTOs definidos como `final readonly class` con constructor property promotion.
    3.  **Prohibición de tipos mixtos (`mixed`):** Cero uso del tipo `mixed`. Se exige tipado explícito (con unión de tipos o DNF si es necesario).
    4.  **Repositorios Tipados:** Los repositorios de datos deben retornar DTOs o colecciones tipadas (Generadores `yield` para conjuntos masivos), encapsulando la lógica SQL.
    5.  **Aislamiento en Consultas Raw:** Si se utiliza PDO directo para consultas custom complejas, **obligatorio** usar `TenantAwarePDO` (Capa 3) que valida `tenant_id` en DML. Prohibida concatenación de variables.

### J. Estrategia de Interacción Kanban (Uso de is_archived)
*   **Decisión:** Segmentación de tareas archivadas a nivel de base de datos para evitar degradación de rendimiento.
*   **Implementación:**
    1.  **En UI:** El componente genérico `KanbanBoard` renderiza las columnas activas. El archivado de una tarjeta se dispara desde un botón de acción en `KanbanCard` invocando el callback `onArchive` hacia la página contenedora.
    2.  **En API y Base de Datos:** Las tareas archivadas tienen `is_archived = 1`. Por defecto, la consulta de la página pide `is_archived = 0`. Si el usuario activa el filtro *"Ver Archivo"*, se cargan las tareas con `is_archived = 1` y se renderiza temporalmente una columna virtual de *"Archivo"* en el Kanban, soportado por el índice de base de datos `idx_kt_lookup`.

### D. Resolución de Dependencias en Desarrollo
*   **Decisión:** Aliases directos en la configuración de Vite y TSConfig.
*   **Implementación:** En desarrollo, los frontends consumen directamente el código TypeScript origen localizado en `packages/*` utilizando aliases (`paths`), evitando requerir pasos de compilación intermedia (`build`) locales para agilizar el desarrollo en caliente.

### E. Motor de Migraciones
*   **Decisión:** Runner nativo escrito en PHP (`migrations/run.php`).
*   **Implementación:** Script ligero que ejecuta sentencias SQL puras y secuenciales, manteniendo auditoría de ejecución en la tabla `migration_logs`, sin requerir de frameworks ORM o dependencias externas.

### F. Monedas y Precisión Financiera
*   **Decisión:** Divisa única definida por Tenant.
*   **Implementación:** Cada tenant configura su moneda base (ej. `USD`, `ARS`) en `app_configs`. Todo valor numérico monetario se procesa en esa moneda y se almacena en columnas de tipo `DECIMAL(15,2)` para evitar imprecisiones de redondeo de coma flotante.

### G. Estándares de Codificación Backend (PHP 8.3+ & PHPStan L9)
*   **Decisión:** Tipado estricto y análisis estático estricto a Nivel 9.
*   **Implementación:**
    1.  **Tipado Estricto:** Cada archivo PHP en el backend (`apps/api`) debe iniciar con `declare(strict_types=1);`.
    2.  **DTOs Inmutables:** Los datos de entrada de la API se deserializan en DTOs definidos como `final readonly class` con constructor property promotion.
    3.  **Prohibición de tipos mixtos (`mixed`):** Cero uso del tipo `mixed`. Se exige tipado explícito (con unión de tipos o DNF si es necesario).
    4.  **Repositorios Tipados:** Los repositorios de datos deben retornar DTOs o colecciones tipadas (Generadores `yield` para conjuntos masivos), encapsulando la lógica SQL.
    5.  **Aislamiento en Consultas Raw:** Si se utiliza PDO directo para consultas custom complejas, se prohíbe la concatenación de variables y es obligatorio delegar en el `BaseRepository` para la inyección automática del filtro `:tenant_id` mediante consultas parametrizadas robustas.

### H. Estrategia de Interacción Kanban (Uso de is_archived)
*   **Decisión:** Segmentación de tareas archivadas a nivel de base de datos para evitar degradación de rendimiento.
*   **Implementación:**
    1.  **En UI:** El componente genérico `KanbanBoard` renderiza las columnas activas. El archivado de una tarjeta se dispara desde un botón de acción en `KanbanCard` invocando el callback `onArchive` hacia la página contenedora.
    2.  **En API y Base de Datos:** Las tareas archivadas tienen `is_archived = 1`. Por defecto, la consulta de la página pide `is_archived = 0`. Si el usuario activa el filtro *"Ver Archivo"*, se cargan las tareas con `is_archived = 1` y se renderiza temporalmente una columna virtual de *"Archivo"* en el Kanban, soportado por el índice de base de datos `idx_kt_lookup`.

---

## 2. Modelo de Permisos y Reglas de Negocio (RBAC & Business Rules)

El sistema abandona la matriz dinámica en base de datos (antigua tabla `permissions`) y las tablas intermedias `tenant_apps`/`user_apps` para simplificar la lógica de control. Se implementan roles globales (`roles`) vinculados a cada usuario por aplicación (`user_roles.role_id → roles`).

### A. Aislamiento Multi-Tenant (Seguridad en Persistencia)
1.  **Aislamiento Físico por Inyección:** Cada consulta del backend (SELECT, INSERT, UPDATE, DELETE) interceptada por el `BaseRepository` inyecta automáticamente la condición `tenant_id = :tenant_id` basándose en el `TenantContext` de la sesión JWT activa. Queda prohibida la consulta de datos cruzados entre inquilinos.
2.  **Activación de Aplicaciones por Plan (sin `tenant_apps`):** El plan de suscripción (`subscription_plans`) determina qué aplicaciones tiene licenciadas el tenant mediante los registros en `plan_limits.module`. Si el plan no tiene límites definidos para un `module`, la app no está disponible. El login valida que `plan_limits` contenga al menos un registro para el `app_id` solicitado. Roles por usuario por app se almacenan en `user_roles` (reemplaza `user_apps`).

### B. Mapeo de Roles Core (`user_roles.role_id → roles`)

1.  **Rol `admin` (Administrador del Sistema / Tenant Admin):**
    *   **Centralizado a nivel de Tenant (Core):** El Tenant Admin gestiona el alta de usuarios e invitaciones en el tenant global y activa/desactiva cuentas. Asigna los roles específicos a cada usuario para las aplicaciones que el plan de suscripción incluya (determinado por `plan_limits.module`). Los usuarios son transversales al ecosistema y visibles en todas las aplicaciones habilitadas.
    *   **En `kodanCRM`:** Configuración global de pipelines, etapas, integraciones y campos personalizados dinámicos para cuentas, contactos y oportunidades.
    *   **En `kodanTRACKER`:** Control total de la parametrización de seguimiento de tiempo. Gestiona los perfiles del tracker (`user_tracker_profiles` para asignar cargos, seniorities y costo por hora), tarifas base de facturación y categorías de tareas maestras (`tasks_master`).
    *   **Finanzas/Aprobaciones (Tracker):** Acceso completo a métricas del portfolio y aprobación de planillas globales.
    *   **Restricción de Carga (Tracker):** No puede imputar horas para sí mismo directamente. Debe hacerlo en representación de recursos operativos (`staff`, `pm`, `commercial`).

2.  **Rol `pm` (Project Manager / Gestor de Proyectos):**
    *   **En `kodanCRM`:** Gestión de cuentas, contactos y oportunidades vinculadas a sus proyectos asignados.
    *   **En `kodanTRACKER`:** Gestión de proyectos, asignación de recursos y tareas.
    *   **Finanzas/Aprobaciones (Tracker):** Acceso completo a costos de personal, tarifas y métricas de rentabilidad/burn-rate de sus proyectos. Aprueba, rechaza y revierte horas del equipo asignado a sus proyectos.
    *   **Carga de Horas (Tracker):** Puede registrar sus propias horas de trabajo en proyectos activos.

3.  **Rol `commercial` (Vendedor / Gestor Comercial):**
    *   **En `kodanCRM`:** Operador comercial principal. Creación y gestión de pipelines de ventas, cuentas, contactos, cotizaciones y chat de oportunidades.
    *   **En `kodanTRACKER`:** Consulta de clientes y visualización del avance físico de proyectos ligados a sus ventas.
    *   **Finanzas/Aprobaciones (Tracker):** **Restricción total**. No visualiza costos de personal ni tarifas de facturación (sólo valor de oportunidad). No tiene permisos para aprobar/rechazar horas.
    *   **Carga de Horas (Tracker):** Puede imputar sus propias horas (ej: tareas de relevamiento, consultoría de venta o reuniones comerciales pre-venta).

4.  **Rol `staff` (Equipo Técnico / Operativo / Recurso):**
    *   **En `kodanCRM`:** Sin acceso (o acceso read-only de consulta a cuentas/contactos de referencia).
    *   **En `kodanTRACKER`:** Registra horas operativas diarias y gestiona sus tareas Kanban asignadas en proyectos activos.
    *   **Finanzas/Aprobaciones (Tracker):** **Restricción total**. No ve costos, tarifas ni rentabilidad. No tiene permisos de aprobación.

5.  **Rol `viewer` (Cliente Externo / C-Level Read-Only):**
    *   **En `kodanCRM`:** Acceso de sólo lectura a oportunidades, cotizaciones y pipelines comerciales.
    *   **En `kodanTRACKER`:** Acceso de sólo lectura a tableros y reportes consolidados.
    *   **Visibilidad Financiera Condicional (Tracker):** El acceso a costes y márgenes se rige por la columna `financial_access` en `user_tracker_profiles`:
        *   `financial_access = 0` (Cliente Externo): Sólo visualiza horas brutas devengadas.
        *   `financial_access = 1` (C-Level / Dirección): Visualiza costos financieros, rentabilidad y desvíos sin poder editar datos.

### C. Reglas de Negocio Inherentes a kodanTRACKER (Reglas de Control de Flujo)

Para mantener la integridad operativa del Time Tracker heredado, el backend implementará las siguientes validaciones estrictas:

#### 1. Bloqueo de Modificación de Horas (Locking Policy)
*   **Regla:** Un recurso con rol `staff` o `commercial` sólo puede crear, actualizar o eliminar registros de tiempo (`time_entries`) en estado `draft` (borrador), `pending` (pendiente) o `rejected` (rechazado).
*   **Restricción:** Si el registro tiene `is_submitted = 1` o `status` en `submitted` o `approved`, el backend bloquea físicamente la petición (`PUT`, `DELETE`) devolviendo `400 Bad Request`. Sólo un usuario con rol `admin` o `pm` en la aplicación de Tracker puede saltarse este bloqueo (para realizar correcciones de auditoría) o revertir el estado del registro a borrador.

#### 2. Restricción de Auto-Imputación de Administradores
*   **Regla:** Un usuario con rol `admin` en Tracker **no puede registrar horas asociadas a su propio ID de usuario**.
*   **Restricción:** El endpoint de creación (`POST /api/time-entries`) exige que los administradores especifiquen un `user_id` de destino (logging *on behalf of* a staff, pm or commercial resource) para imputar horas a personal operativo. Si intentan registrar horas bajo su propia cuenta, el servidor retornará un error `400 Bad Request`. Esto garantiza que los costos operativos y de desarrollo no se contaminen con horas administrativas no productivas.

#### 3. Validación de Proyecto Activo
*   **Regla:** Sólo se pueden imputar horas (`time_entries`) o crear/asignar tareas Kanban en proyectos cuyo estado sea `'active'`.
*   **Restricción:** Si el proyecto está `'paused'` (pausado) o `'completed'` (completado), el backend rechazará la transacción inmediatamente.

#### 4. Validación de Tareas Maestras por Tenant
*   **Regla:** El `task_id` proporcionado en el registro de tiempo debe pertenecer al `tenant_id` activo del usuario en la tabla `tasks_master` o ser una tarea global del sistema (`tenant_id IS NULL`). Cualquier otro ID resultará en un error `403 Forbidden`.

#### 5. Transición Automática y Registro de Auditoría (Audit Logs)
*   **Regla:** Cualquier cambio de estado en un registro de horas (`draft` -> `submitted` -> `approved` / `rejected`) debe guardar un registro histórico en la tabla `time_entry_logs` detallando el usuario que realizó la acción, estado anterior, nuevo estado y justificación (obligatoria en caso de rechazo).

#### 6. Validación de Límites de Plan (Plan Limits Enforcement) — **NUEVO**
*   **Arquitectura:** Tabla relacional `plan_limits` (plan_id, module, metric, value) + `tenant_plan_usage` (tenant_id, module, metric, current_value) + Vista `v_tenant_plan_limits`.
*   **Validación Atómica (Escritura):** Antes de `INSERT` en entidad limitada (pipeline, project, user, etc.):
    ```sql
    -- En transacción (BaseRepository):
    -- 1. Verificar capacidad (SELECT ... FROM v_tenant_plan_limits WHERE has_capacity=1 FOR SHARE)
    -- 2. Incrementar contador atómico:
    UPDATE `tenant_plan_usage` 
    SET `current_value` = `current_value` + 1 
    WHERE `tenant_id` = ? AND `module` = ? AND `metric` = ?;
    -- 3. Si ROW_COUNT() = 0 → INSERT nuevo contador (primer uso)
    -- 4. Si has_capacity = 0 → EXCEPTION 403 "PLAN_LIMIT_EXCEEDED"
    ```
*   **Métricas Iniciales por Módulo:**
    | Módulo | Métrica | Descripción |
    |--------|---------|-------------|
    | `crm` | `users_max` | Máximo usuarios con rol en CRM |
    | `crm` | `negotiations_max` | Máximo negociaciones activas |
    | `crm` | `api_calls_month` | Llamadas API/mes (CRM) |
    | `tracker` | `users_max` | Máximo usuarios con rol en Tracker |
    | `tracker` | `tasks_max` | Máximo tareas activas |
    | `tracker` | `api_calls_month` | Llamadas API/mes (Tracker) |
*   **Frontend:** Componente `PlanUsageBadge` consume `GET /api/tenant/limits` → devuelve `{ module, metric, limit, usage, percentage }` para badges visuales.
*   **Super Admin:** CRUD completo en `plan_limits` via panel de administración.

---

## 3. Requisitos de Negocio y Funcionalidades por Módulo

### A. Core y Administración Central
*   **Super Administrador (Global):**
    *   Creación manual de tenants en la plataforma.
    *   Activación e inactivación física de tenants (`tenants.is_active`). La desactivación bloquea de forma inmediata cualquier login o petición API asociada.
    *   Asignación y escalado de planes de suscripción (`subscription_plan_id`).
    *   Gestionar apps disponibles en el catálogo (`apps`).
    *   Configurar límites por plan/módulo/métrica en tabla relacional `plan_limits` (CRUD en panel Super Admin).
*   **Administrador de Tenant (Local):**
    *   Crear usuarios nuevos e invitarlos al tenant.
    *   Activar y desactivar usuarios de su propio tenant (`users.is_active = 0/1`). Un administrador local no puede alterar usuarios de otros tenants.
    *   Asignación de roles específicos por aplicación activa en `user_roles`.
    *   Ajuste de configuraciones de aplicación mediante `app_configs`.

### B. Módulo CRM (kodanCRM)
*   **Gestión B2B:** Registro elástico de cuentas y contactos con soporte para campos dinámicos definidos por el tenant.
*   **Pipeline de Ventas Dinámico:**
    *   Creación ilimitada de Pipelines por Tenant.
    *   Definición de Etapas por Pipeline con control de ordenación numérica y colores HEX para el renderizado del tablero Kanban.
*   **Flujo de Cierre Comercial (Interacción Won-Opportunity):**
    *   Al transicionar una oportunidad a una etapa donde `is_won_stage = 1`, se intercepta el flujo.
    *   Se despliega un modal interactivo en frontend: *"¿Deseas crear un proyecto de seguimiento de tiempo en TimeTracker?"*, permitiendo definir el presupuesto de horas.
    *   Si se acepta, el backend inserta el proyecto en `projects` mapeando la relación con la cuenta y la oportunidad ganada.
*   **Mensajería y Colaboración Comercial:**
    *   Mensajería de chat interna en oportunidades y cuentas con soporte para hilos de discusión, archivos adjuntos y menciones a miembros del equipo.
    *   Catálogo de productos y cotizaciones estructuradas con cálculo de impuestos y descuentos en ítems de línea.

### C. Módulo TimeTracker (kodanTRACKER)
*   **Gestión de Proyectos (Sin Iniciativas):**
    *   Se elimina por completo la tabla y lógica de "iniciativas".
    *   Los proyectos están directamente asignados a cuentas (`accounts`) e asociados a negociaciones ganadas.
*   **Imputación de Tiempo y Costos:**
    *   Widget con cronómetro interactivo para registrar actividades (`time_entries`).
    *   Calculadora de costos en base al perfil de cargos y seniorities del usuario (`user_tracker_profiles`).
    *   Triggers financieros en BD para auditar costos de proyectos en tiempo real.
    *   Control de capacidad semanal (`weekly_capacity`) del recurso.
*   **Métricas del Proyecto (Metrics):**
    *   Cálculo de horas imputadas totales vs presupuesto asignado por proyecto.
    *   Costo acumulado incurrido en tiempo real en base a la sumatoria del costo por hora de cada usuario al momento de imputar.
    *   Desvío porcentual de horas y cálculo de velocidad de consumo de horas (*burn rate*) del presupuesto.
    *   Rentabilidad neta del proyecto: Cálculo de desvío entre el valor de la oportunidad ganada en el CRM y la sumatoria de costos de recursos más costos directos imputados en la tabla `costs`.
*   **Envío y Aprobación de Horas:**
    *   El usuario reporta e inmoviliza sus imputaciones mediante el flag `time_entries.is_submitted = 1` al final de su ciclo.
    *   El admin o el PM evalúan el listado y setean `approval_status` (`approved` / `rejected`). Si una entrada de tiempo está aprobada, se bloquea ante modificaciones físicas.
*   **Módulo de Reasignación de Recursos (Timeline):**
    *   Evaluación algorítmica de horas excedidas en el perfil del recurso y sugerencias automáticas de reasignación a miembros con capacidad ociosa en el mismo proyecto.
*   **Motor Analítico de Insights y Alertas AI:**
    *   Alertas predictivas basadas en desvíos de horas estimadas vs consumidas.
    *   Asistencia e insights automáticos por IA en consultas de reportes personalizados.

---

## 4. Modelo de Datos: Esquema de Base de Datos (`admkoda_BBDD_APPS`)

Esquema de base de datos unificado. Las claves foráneas y la cascada de eliminación garantizan la integridad multi-tenant:

### A. Estructuras Core (Unificadas)

```sql
CREATE TABLE `subscription_plans` (
  `id` BIGINT(20) UNSIGNED NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(100) NOT NULL,
  `description` TEXT DEFAULT NULL,
  `price` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  `currency` CHAR(3) NOT NULL DEFAULT 'USD',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP(),
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP() ON UPDATE CURRENT_TIMESTAMP(),
  `deleted_at` TIMESTAMP NULL DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Catálogo de aplicaciones (gestionado por Super Admin)
CREATE TABLE `apps` (
  `app_id` VARCHAR(50) NOT NULL,
  `name` VARCHAR(100) NOT NULL,
  `description` VARCHAR(255) DEFAULT NULL,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP(),
  PRIMARY KEY (`app_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Catálogo global de roles por app (gestionado por Super Admin)
CREATE TABLE `roles` (
  `id` BIGINT(20) UNSIGNED NOT NULL AUTO_INCREMENT,
  `app_id` VARCHAR(50) NOT NULL,
  `name` VARCHAR(50) NOT NULL,
  `description` VARCHAR(255) DEFAULT NULL,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_role_app_name` (`app_id`, `name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Límites por plan y módulo (relacional, tipado, consultable, validable)
-- module referencia lógicamente apps.app_id (sin FK forzada para flexibilidad)
CREATE TABLE `plan_limits` (
  `id` BIGINT(20) UNSIGNED NOT NULL AUTO_INCREMENT,
  `plan_id` BIGINT(20) UNSIGNED NOT NULL,
  `module` VARCHAR(50) NOT NULL COMMENT 'Referencia a apps.app_id',
  `metric` VARCHAR(50) NOT NULL COMMENT 'Nombre de la métrica: users_max, negotiations_max, tasks_max, api_calls_month, etc.',
  `value` INT(11) NOT NULL DEFAULT 0 COMMENT 'Valor del límite (0 = ilimitado)',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP(),
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP() ON UPDATE CURRENT_TIMESTAMP(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_plan_module_metric` (`plan_id`, `module`, `metric`),
  CONSTRAINT `fk_plan_limits_plan` FOREIGN KEY (`plan_id`) REFERENCES `subscription_plans` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `tenants` (
  `tenant_id` BIGINT(20) NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(255) NOT NULL,
  `logo_url` TEXT NULL DEFAULT NULL COMMENT 'Logo empresa (base64, máx 500KB)',
  `subscription_plan_id` BIGINT(20) UNSIGNED DEFAULT NULL,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `is_system_tenant` TINYINT(1) NOT NULL DEFAULT 0 COMMENT 'TRUE = tenant de control del sistema (Super Admin)',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP(),
  PRIMARY KEY (`tenant_id`),
  CONSTRAINT `fk_tenants_subscription` FOREIGN KEY (`subscription_plan_id`) REFERENCES `subscription_plans` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `users` (
  `id` BIGINT(20) NOT NULL AUTO_INCREMENT,
  `tenant_id` BIGINT(20) NOT NULL,
  `email` VARCHAR(255) NOT NULL,
  `password_hash` VARCHAR(255) NOT NULL,
  `display_name` VARCHAR(100) NOT NULL,
  `is_super_admin` TINYINT(1) NOT NULL DEFAULT 0,
  `language` VARCHAR(10) DEFAULT 'es_AR',
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_user_email_global` (`email`),
  KEY `idx_users_tenant_lookup` (`tenant_id`, `id`),
  CONSTRAINT `fk_users_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`tenant_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `user_roles` (
  `user_id` BIGINT(20) NOT NULL,
  `app_id` VARCHAR(50) NOT NULL,
  `role_id` BIGINT(20) UNSIGNED NOT NULL,
  `assigned_by` BIGINT(20) DEFAULT NULL COMMENT 'User ID que asignó el rol',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP(),
  PRIMARY KEY (`user_id`, `app_id`),
  CONSTRAINT `fk_user_roles_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_user_roles_role` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `user_configs` (
  `user_id` BIGINT(20) NOT NULL,
  `app_id` VARCHAR(50) NOT NULL,
  `avatar_url` VARCHAR(255) DEFAULT NULL,
  `theme_colors` JSON DEFAULT NULL,
  PRIMARY KEY (`user_id`, `app_id`),
  CONSTRAINT `fk_user_configs_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `app_configs` (
  `tenant_id` BIGINT(20) NOT NULL,
  `app_id` VARCHAR(50) NOT NULL,
  `config_key` VARCHAR(100) NOT NULL,
  `config_value` TEXT DEFAULT NULL,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP() ON UPDATE CURRENT_TIMESTAMP(),
  PRIMARY KEY (`tenant_id`, `app_id`, `config_key`),
  CONSTRAINT `fk_app_configs_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`tenant_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `tenant_invoices` (
  `id` BIGINT(20) NOT NULL AUTO_INCREMENT,
  `tenant_id` BIGINT(20) NOT NULL,
  `amount` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  `status` ENUM('pending', 'paid', 'overdue') NOT NULL DEFAULT 'pending',
  `due_date` DATE NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP(),
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_invoices_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`tenant_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `tenant_plan_usage` (
  `tenant_id` BIGINT(20) NOT NULL,
  `module` VARCHAR(50) NOT NULL COMMENT 'Referencia a apps.app_id',
  `metric` VARCHAR(50) NOT NULL COMMENT 'Referencia a plan_limits.metric',
  `current_value` BIGINT(20) NOT NULL DEFAULT 0 COMMENT 'Contador atómico (UPDATE ... SET current_value = current_value + 1)',
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP() ON UPDATE CURRENT_TIMESTAMP(),
  PRIMARY KEY (`tenant_id`, `module`, `metric`),
  CONSTRAINT `fk_usage_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`tenant_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Vista para verificar límites en tiempo real (tenant + plan + uso)
CREATE OR REPLACE VIEW `v_tenant_plan_limits` AS
SELECT 
  t.`tenant_id`,
  t.`subscription_plan_id`,
  pl.`module`,
  pl.`metric`,
  pl.`value` AS `limit_value`,
  COALESCE(u.`current_value`, 0) AS `current_usage`,
  CASE 
    WHEN pl.`value` = 0 THEN 1  -- 0 = ilimitado
    WHEN COALESCE(u.`current_value`, 0) < pl.`value` THEN 1
    ELSE 0
  END AS `has_capacity`
FROM `tenants` t
JOIN `subscription_plans` sp ON sp.`id` = t.`subscription_plan_id`
JOIN `plan_limits` pl ON pl.`plan_id` = sp.`id`
LEFT JOIN `tenant_plan_usage` u 
  ON u.`tenant_id` = t.`tenant_id` 
  AND u.`module` = pl.`module` 
  AND u.`metric` = pl.`metric`
WHERE t.`is_active` = 1 AND sp.`deleted_at` IS NULL;

CREATE TABLE `login_attempts` (
  `id` BIGINT(20) NOT NULL AUTO_INCREMENT,
  `email` VARCHAR(255) NOT NULL,
  `ip_address` VARCHAR(45) NOT NULL,
  `attempted_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP(),
  PRIMARY KEY (`id`),
  KEY `idx_la_email_ip` (`email`, `ip_address`, `attempted_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `password_resets` (
  `email` VARCHAR(255) NOT NULL,
  `token_hash` VARCHAR(255) NOT NULL COMMENT 'bcrypt(token_raw) — NUNCA guardar token en texto plano',
  `expires_at` DATETIME NOT NULL COMMENT 'TTL 15-30 min desde creación',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP(),
  PRIMARY KEY (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla para Refresh Tokens con rotación obligatoria
CREATE TABLE `refresh_tokens` (
  `id` BIGINT(20) UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` BIGINT(20) NOT NULL,
  `tenant_id` BIGINT(20) NOT NULL,
  `token_hash` VARCHAR(255) NOT NULL COMMENT 'bcrypt(token_raw)',
  `user_agent` VARCHAR(500) DEFAULT NULL,
  `ip_address` VARCHAR(45) DEFAULT NULL,
  `expires_at` DATETIME NOT NULL COMMENT 'now() + 30 días (sliding window)',
  `revoked_at` DATETIME DEFAULT NULL,
  `replaced_by_token_id` BIGINT(20) UNSIGNED DEFAULT NULL COMMENT 'Chain de rotación para detección de reuso',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_rt_user_active` (`user_id`, `revoked_at`, `expires_at`),
  KEY `idx_rt_token_hash` (`token_hash`),
  CONSTRAINT `fk_rt_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_rt_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`tenant_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_rt_replaced` FOREIGN KEY (`replaced_by_token_id`) REFERENCES `refresh_tokens` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### B. Entidades de Soporte y Datos Elásticos

```sql
CREATE TABLE `accounts` (
  `account_id` BIGINT(20) NOT NULL AUTO_INCREMENT,
  `tenant_id` BIGINT(20) NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `legal_name` VARCHAR(255) DEFAULT NULL,
  `tax_id` VARCHAR(50) DEFAULT NULL,
  `website` VARCHAR(255) DEFAULT NULL,
  `phone` VARCHAR(50) DEFAULT NULL,
  `address` TEXT DEFAULT NULL,
  `custom_fields` JSON NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP(),
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP() ON UPDATE CURRENT_TIMESTAMP(),
  PRIMARY KEY (`account_id`),
  CONSTRAINT `fk_accounts_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`tenant_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `contacts` (
  `contact_id` BIGINT(20) NOT NULL AUTO_INCREMENT,
  `tenant_id` BIGINT(20) NOT NULL,
  `account_id` BIGINT(20) DEFAULT NULL,
  `first_name` VARCHAR(150) NOT NULL,
  `last_name` VARCHAR(150) NOT NULL,
  `email` VARCHAR(255) NOT NULL,
  `phone` VARCHAR(50) DEFAULT NULL,
  `mobile` VARCHAR(50) DEFAULT NULL,
  `custom_fields` JSON NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP(),
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP() ON UPDATE CURRENT_TIMESTAMP(),
  PRIMARY KEY (`contact_id`),
  CONSTRAINT `fk_contacts_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`tenant_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_contacts_account` FOREIGN KEY (`account_id`) REFERENCES `accounts` (`account_id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `custom_field_definitions` (
  `id` BIGINT(20) NOT NULL AUTO_INCREMENT,
  `tenant_id` BIGINT(20) NOT NULL,
  `entity_type` ENUM('account', 'contact', 'opportunity') NOT NULL,
  `field_key` VARCHAR(50) NOT NULL,
  `field_label` VARCHAR(100) NOT NULL,
  `field_type` ENUM('text', 'number', 'select', 'date', 'boolean') NOT NULL,
  `options` JSON DEFAULT NULL,
  `is_required` TINYINT(1) NOT NULL DEFAULT 0,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_tenant_entity_field` (`tenant_id`, `entity_type`, `field_key`),
  CONSTRAINT `fk_cf_definitions_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`tenant_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `custom_field_values` (
  `id` BIGINT(20) NOT NULL AUTO_INCREMENT,
  `tenant_id` BIGINT(20) NOT NULL,
  `entity_type` ENUM('account', 'contact', 'opportunity') NOT NULL,
  `entity_id` BIGINT(20) NOT NULL,
  `field_key` VARCHAR(50) NOT NULL,
  `value` TEXT DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_cf_values_lookup` (`tenant_id`, `entity_type`, `field_key`, `value`(100)),
  KEY `idx_cf_values_entity` (`entity_type`, `entity_id`),
  CONSTRAINT `fk_cf_values_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`tenant_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### C. Módulo CRM (Comercial y Colaboración)

```sql
CREATE TABLE `pipelines` (
  `id` BIGINT(20) NOT NULL AUTO_INCREMENT,
  `tenant_id` BIGINT(20) NOT NULL,
  `name` VARCHAR(100) NOT NULL,
  `is_default` TINYINT(1) NOT NULL DEFAULT 0,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP(),
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_pipelines_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`tenant_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `pipeline_stages` (
  `id` BIGINT(20) NOT NULL AUTO_INCREMENT,
  `pipeline_id` BIGINT(20) NOT NULL,
  `name` VARCHAR(100) NOT NULL,
  `color_hex` VARCHAR(7) NOT NULL DEFAULT '#6366F1',
  `sort_order` INT(11) NOT NULL DEFAULT 0,
  `is_won_stage` TINYINT(1) NOT NULL DEFAULT 0,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP(),
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_stages_pipeline` FOREIGN KEY (`pipeline_id`) REFERENCES `pipelines` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `opportunities` (
  `id` BIGINT(20) NOT NULL AUTO_INCREMENT,
  `tenant_id` BIGINT(20) NOT NULL,
  `account_id` BIGINT(20) NOT NULL,
  `contact_id` BIGINT(20) DEFAULT NULL,
  `pipeline_stage_id` BIGINT(20) NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `value` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  `currency` CHAR(3) NOT NULL DEFAULT 'USD',
  `close_date` DATE DEFAULT NULL,
  `owner_user_id` BIGINT(20) DEFAULT NULL,
  `custom_fields` JSON NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP(),
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP() ON UPDATE CURRENT_TIMESTAMP(),
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_opportunities_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`tenant_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_opportunities_account` FOREIGN KEY (`account_id`) REFERENCES `accounts` (`account_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_opportunities_contact` FOREIGN KEY (`contact_id`) REFERENCES `contacts` (`contact_id`) ON DELETE SET NULL,
  CONSTRAINT `fk_opportunities_stage` FOREIGN KEY (`pipeline_stage_id`) REFERENCES `pipeline_stages` (`id`),
  CONSTRAINT `fk_opportunities_owner` FOREIGN KEY (`owner_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `products` (
  `id` BIGINT(20) NOT NULL AUTO_INCREMENT,
  `tenant_id` BIGINT(20) NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `sku` VARCHAR(100) DEFAULT NULL,
  `price` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_products_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`tenant_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `opportunity_line_items` (
  `id` BIGINT(20) NOT NULL AUTO_INCREMENT,
  `opportunity_id` BIGINT(20) NOT NULL,
  `product_id` BIGINT(20) NOT NULL,
  `quantity` DECIMAL(10,2) NOT NULL DEFAULT 1.00,
  `unit_price` DECIMAL(15,2) NOT NULL,
  `discount_percentage` DECIMAL(5,2) NOT NULL DEFAULT 0.00,
  `tax_percentage` DECIMAL(5,2) NOT NULL DEFAULT 0.00,
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_oli_opportunity` FOREIGN KEY (`opportunity_id`) REFERENCES `opportunities` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_oli_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `quotes` (
  `id` BIGINT(20) NOT NULL AUTO_INCREMENT,
  `tenant_id` BIGINT(20) NOT NULL,
  `opportunity_id` BIGINT(20) NOT NULL,
  `quote_number` VARCHAR(50) NOT NULL,
  `status` ENUM('draft', 'sent', 'accepted', 'rejected') NOT NULL DEFAULT 'draft',
  `total_amount` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP(),
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_quotes_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`tenant_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_quotes_opportunity` FOREIGN KEY (`opportunity_id`) REFERENCES `opportunities` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `quote_line_items` (
  `id` BIGINT(20) NOT NULL AUTO_INCREMENT,
  `quote_id` BIGINT(20) NOT NULL,
  `product_id` BIGINT(20) NOT NULL,
  `quantity` DECIMAL(10,2) NOT NULL DEFAULT 1.00,
  `unit_price` DECIMAL(15,2) NOT NULL,
  `discount_percentage` DECIMAL(5,2) NOT NULL DEFAULT 0.00,
  `tax_percentage` DECIMAL(5,2) NOT NULL DEFAULT 0.00,
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_qli_quote` FOREIGN KEY (`quote_id`) REFERENCES `quotes` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_qli_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `tasks` (
  `id` BIGINT(20) NOT NULL AUTO_INCREMENT,
  `tenant_id` BIGINT(20) NOT NULL,
  `opportunity_id` BIGINT(20) DEFAULT NULL,
  `title` VARCHAR(255) NOT NULL,
  `description` TEXT DEFAULT NULL,
  `due_date` DATETIME DEFAULT NULL,
  `status` ENUM('pending', 'completed') NOT NULL DEFAULT 'pending',
  `assigned_to` BIGINT(20) DEFAULT NULL,
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_tasks_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`tenant_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_tasks_opportunity` FOREIGN KEY (`opportunity_id`) REFERENCES `opportunities` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_tasks_assignee` FOREIGN KEY (`assigned_to`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `task_history_logs` (
  `id` BIGINT(20) NOT NULL AUTO_INCREMENT,
  `task_id` BIGINT(20) NOT NULL,
  `changed_by` BIGINT(20) NOT NULL,
  `old_status` VARCHAR(50) DEFAULT NULL,
  `new_status` VARCHAR(50) NOT NULL,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP(),
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_thl_task` FOREIGN KEY (`task_id`) REFERENCES `tasks` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `task_participants` (
  `task_id` BIGINT(20) NOT NULL,
  `user_id` BIGINT(20) NOT NULL,
  PRIMARY KEY (`task_id`, `user_id`),
  CONSTRAINT `fk_tp_task` FOREIGN KEY (`task_id`) REFERENCES `tasks` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_tp_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `message_threads` (
  `id` BIGINT(20) NOT NULL AUTO_INCREMENT,
  `tenant_id` BIGINT(20) NOT NULL,
  `opportunity_id` BIGINT(20) DEFAULT NULL,
  `subject` VARCHAR(255) DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP(),
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_threads_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`tenant_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_threads_opportunity` FOREIGN KEY (`opportunity_id`) REFERENCES `opportunities` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `messages` (
  `id` BIGINT(20) NOT NULL AUTO_INCREMENT,
  `tenant_id` BIGINT(20) NOT NULL,
  `thread_id` BIGINT(20) DEFAULT NULL,
  `opportunity_id` BIGINT(20) DEFAULT NULL,
  `user_id` BIGINT(20) NOT NULL,
  `body` TEXT NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP(),
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_messages_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`tenant_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_messages_thread` FOREIGN KEY (`thread_id`) REFERENCES `message_threads` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_messages_opportunity` FOREIGN KEY (`opportunity_id`) REFERENCES `opportunities` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_messages_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `message_attachments` (
  `id` BIGINT(20) NOT NULL AUTO_INCREMENT,
  `message_id` BIGINT(20) NOT NULL,
  `file_path` VARCHAR(255) NOT NULL,
  `file_name` VARCHAR(255) NOT NULL,
  `file_size` INT(11) NOT NULL,
  `uploaded_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP(),
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_attachments_message` FOREIGN KEY (`message_id`) REFERENCES `messages` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `message_mentions` (
  `message_id` BIGINT(20) NOT NULL,
  `user_id` BIGINT(20) NOT NULL,
  PRIMARY KEY (`message_id`, `user_id`),
  CONSTRAINT `fk_mentions_message` FOREIGN KEY (`message_id`) REFERENCES `messages` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_mentions_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### D. Módulo Tracker (Seguimiento de Tiempos y Metadatos)

```sql
CREATE TABLE `positions` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `tenant_id` BIGINT(20) NOT NULL,
  `name` VARCHAR(100) NOT NULL,
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_positions_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`tenant_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `position_costs` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `position_id` INT(11) NOT NULL,
  `hourly_cost` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  `valid_from` DATE NOT NULL,
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_pc_position` FOREIGN KEY (`position_id`) REFERENCES `positions` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `seniorities` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `tenant_id` BIGINT(20) NOT NULL,
  `name` VARCHAR(50) NOT NULL,
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_seniorities_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`tenant_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `user_tracker_profiles` (
  `user_id` BIGINT(20) NOT NULL,
  `tenant_id` BIGINT(20) NOT NULL,
  `position_id` INT(11) DEFAULT NULL,
  `seniority_id` INT(11) DEFAULT NULL,
  `hourly_cost` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  `weekly_capacity` DECIMAL(5,2) NOT NULL DEFAULT 40.00,
  `financial_access` TINYINT(1) NOT NULL DEFAULT 0,
  PRIMARY KEY (`user_id`),
  CONSTRAINT `fk_utp_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_utp_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`tenant_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_utp_position` FOREIGN KEY (`position_id`) REFERENCES `positions` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_utp_seniority` FOREIGN KEY (`seniority_id`) REFERENCES `seniorities` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `projects` (
  `id` BIGINT(20) NOT NULL AUTO_INCREMENT,
  `tenant_id` BIGINT(20) NOT NULL,
  `account_id` BIGINT(20) NOT NULL,
  `opportunity_id` BIGINT(20) DEFAULT NULL,
  `name` VARCHAR(255) NOT NULL,
  `budget_hours` DECIMAL(10,2) DEFAULT NULL,
  `status` ENUM('active', 'paused', 'completed') NOT NULL DEFAULT 'active',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_opportunity_project` (`opportunity_id`),
  CONSTRAINT `fk_projects_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`tenant_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_projects_account` FOREIGN KEY (`account_id`) REFERENCES `accounts` (`account_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_projects_opportunity` FOREIGN KEY (`opportunity_id`) REFERENCES `opportunities` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `time_entries` (
  `id` BIGINT(20) NOT NULL AUTO_INCREMENT,
  `tenant_id` BIGINT(20) NOT NULL,
  `project_id` BIGINT(20) NOT NULL,
  `user_id` BIGINT(20) NOT NULL,
  `description` TEXT DEFAULT NULL,
  `start_time` DATETIME NOT NULL,
  `end_time` DATETIME DEFAULT NULL,
  `duration_minutes` INT(11) GENERATED ALWAYS AS (
    CASE 
      WHEN `end_time` IS NULL THEN NULL 
      ELSE TIMESTAMPDIFF(MINUTE, `start_time`, `end_time`) 
    END
  ) STORED,
  `cost_calculated` DECIMAL(15,2) DEFAULT NULL,
  `is_submitted` TINYINT(1) NOT NULL DEFAULT 0,
  `approval_status` ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP(),
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_time_entries_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`tenant_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_time_entries_project` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_time_entries_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `time_entry_logs` (
  `id` BIGINT(20) NOT NULL AUTO_INCREMENT,
  `time_entry_id` BIGINT(20) NOT NULL,
  `changed_by` BIGINT(20) NOT NULL,
  `action` ENUM('update', 'delete') NOT NULL,
  `old_values` JSON NOT NULL,
  `logged_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP(),
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_tel_entry` FOREIGN KEY (`time_entry_id`) REFERENCES `time_entries` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `kanban_tasks` (
  `id` BIGINT(20) NOT NULL AUTO_INCREMENT,
  `tenant_id` BIGINT(20) NOT NULL,
  `project_id` BIGINT(20) NOT NULL,
  `user_id` BIGINT(20) DEFAULT NULL,
  `title` VARCHAR(255) NOT NULL,
  `description` TEXT DEFAULT NULL,
  `status` ENUM('todo', 'in_progress', 'done') NOT NULL DEFAULT 'todo',
  `sort_order` INT(11) NOT NULL DEFAULT 0,
  `is_archived` TINYINT(1) NOT NULL DEFAULT 0,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP(),
  PRIMARY KEY (`id`),
  KEY `idx_kt_lookup` (`project_id`, `is_archived`, `status`),
  CONSTRAINT `fk_kt_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`tenant_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_kt_project` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_kt_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `audit_logs` (
  `id` BIGINT(20) NOT NULL AUTO_INCREMENT,
  `tenant_id` BIGINT(20) NOT NULL,
  `user_id` BIGINT(20) DEFAULT NULL,
  `action` VARCHAR(255) NOT NULL,
  `details` TEXT DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP(),
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_audit_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`tenant_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `notifications` (
  `id` BIGINT(20) NOT NULL AUTO_INCREMENT,
  `tenant_id` BIGINT(20) NOT NULL,
  `user_id` BIGINT(20) NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `message` TEXT NOT NULL,
  `is_read` TINYINT(1) NOT NULL DEFAULT 0,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP(),
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_notifications_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`tenant_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_notifications_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `costs` (
  `id` BIGINT(20) NOT NULL AUTO_INCREMENT,
  `tenant_id` BIGINT(20) NOT NULL,
  `project_id` BIGINT(20) NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `amount` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  `logged_date` DATE NOT NULL,
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_costs_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`tenant_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_costs_project` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `tasks_master` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `tenant_id` BIGINT(20) NULL COMMENT 'NULL = tarea global del sistema, disponible para todos los tenants',
  `name` VARCHAR(255) NOT NULL,
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_tm_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`tenant_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Índice para búsquedas de tareas globales + por tenant
CREATE INDEX `idx_tasks_master_tenant` ON `tasks_master` (`tenant_id`);

CREATE TABLE `summary_projects_stats` (
  `project_id` BIGINT(20) NOT NULL,
  `tenant_id` BIGINT(20) NOT NULL,
  `total_logged_minutes` BIGINT(20) NOT NULL DEFAULT 0,
  `total_calculated_cost` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  `total_direct_costs` DECIMAL(15,2) NOT NULL DEFAULT 0.00 COMMENT 'Costos directos de tabla costs',
  `last_entry_at` DATETIME DEFAULT NULL,
  PRIMARY KEY (`project_id`),
  CONSTRAINT `fk_sps_project` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_sps_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`tenant_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- TRIGGERS SÍNCRONOS: summary_projects_stats (Hot Path, Sin Cron)
-- ============================================================

DELIMITER $$

-- time_entries → AFTER INSERT
CREATE TRIGGER `trg_time_entries_after_insert`
AFTER INSERT ON `time_entries`
FOR EACH ROW
BEGIN
    INSERT INTO `summary_projects_stats` 
        (`project_id`, `tenant_id`, `total_logged_minutes`, `total_calculated_cost`, `total_direct_costs`, `last_entry_at`)
    VALUES 
        (NEW.`project_id`, NEW.`tenant_id`, COALESCE(NEW.`duration_minutes`, 0), COALESCE(NEW.`cost_calculated`, 0), 0, NEW.`end_time`)
    ON DUPLICATE KEY UPDATE
        `total_logged_minutes` = `total_logged_minutes` + COALESCE(NEW.`duration_minutes`, 0),
        `total_calculated_cost` = `total_calculated_cost` + COALESCE(NEW.`cost_calculated`, 0),
        `last_entry_at` = GREATEST(COALESCE(`last_entry_at`, '1970-01-01'), COALESCE(NEW.`end_time`, NEW.`start_time`));
END$$

-- time_entries → AFTER UPDATE
CREATE TRIGGER `trg_time_entries_after_update`
AFTER UPDATE ON `time_entries`
FOR EACH ROW
BEGIN
    DECLARE diff_minutes BIGINT DEFAULT 0;
    DECLARE diff_cost DECIMAL(15,2) DEFAULT 0;
    
    SET diff_minutes = COALESCE(NEW.`duration_minutes`, 0) - COALESCE(OLD.`duration_minutes`, 0);
    SET diff_cost = COALESCE(NEW.`cost_calculated`, 0) - COALESCE(OLD.`cost_calculated`, 0);
    
    IF diff_minutes != 0 OR diff_cost != 0 OR NEW.`end_time` != OLD.`end_time` THEN
        UPDATE `summary_projects_stats` s
        SET 
            `total_logged_minutes` = `total_logged_minutes` + diff_minutes,
            `total_calculated_cost` = `total_calculated_cost` + diff_cost,
            `last_entry_at` = CASE 
                WHEN NEW.`end_time` > COALESCE(s.`last_entry_at`, '1970-01-01') THEN NEW.`end_time`
                WHEN OLD.`end_time` = s.`last_entry_at` THEN (
                    SELECT COALESCE(MAX(`end_time`), NULL) FROM `time_entries` WHERE `project_id` = NEW.`project_id`
                )
                ELSE s.`last_entry_at`
            END
        WHERE s.`project_id` = NEW.`project_id`;
    END IF;
END$$

-- time_entries → AFTER DELETE
CREATE TRIGGER `trg_time_entries_after_delete`
AFTER DELETE ON `time_entries`
FOR EACH ROW
BEGIN
    UPDATE `summary_projects_stats` s
    SET 
        `total_logged_minutes` = `total_logged_minutes` - COALESCE(OLD.`duration_minutes`, 0),
        `total_calculated_cost` = `total_calculated_cost` - COALESCE(OLD.`cost_calculated`, 0),
        `last_entry_at` = CASE 
            WHEN OLD.`end_time` = s.`last_entry_at` THEN (
                SELECT COALESCE(MAX(`end_time`), NULL) FROM `time_entries` WHERE `project_id` = OLD.`project_id`
            )
            ELSE s.`last_entry_at`
        END
    WHERE s.`project_id` = OLD.`project_id`;
END$$

-- costs → AFTER INSERT
CREATE TRIGGER `trg_costs_after_insert`
AFTER INSERT ON `costs`
FOR EACH ROW
BEGIN
    UPDATE `summary_projects_stats` 
    SET `total_direct_costs` = `total_direct_costs` + NEW.`amount`
    WHERE `project_id` = NEW.`project_id`;
END$$

-- costs → AFTER UPDATE
CREATE TRIGGER `trg_costs_after_update`
AFTER UPDATE ON `costs`
FOR EACH ROW
BEGIN
    IF NEW.`amount` != OLD.`amount` OR NEW.`project_id` != OLD.`project_id` THEN
        UPDATE `summary_projects_stats` 
        SET `total_direct_costs` = `total_direct_costs` - OLD.`amount`
        WHERE `project_id` = OLD.`project_id`;
        
        UPDATE `summary_projects_stats` 
        SET `total_direct_costs` = `total_direct_costs` + NEW.`amount`
        WHERE `project_id` = NEW.`project_id`;
    END IF;
END$$

-- costs → AFTER DELETE
CREATE TRIGGER `trg_costs_after_delete`
AFTER DELETE ON `costs`
FOR EACH ROW
BEGIN
    UPDATE `summary_projects_stats` 
    SET `total_direct_costs` = `total_direct_costs` - OLD.`amount`
    WHERE `project_id` = OLD.`project_id`;
END$$

DELIMITER ;

CREATE TABLE `custom_report_runs` (
  `id` BIGINT(20) NOT NULL AUTO_INCREMENT,
  `tenant_id` BIGINT(20) NOT NULL,
  `user_id` BIGINT(20) NOT NULL,
  `query_parameters` JSON NOT NULL,
  `executed_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP(),
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_crr_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`tenant_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_crr_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `custom_report_views` (
  `id` BIGINT(20) NOT NULL AUTO_INCREMENT,
  `tenant_id` BIGINT(20) NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `query_parameters` JSON NOT NULL,
  `created_by` BIGINT(20) NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP(),
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_crv_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`tenant_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_crv_user` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

---

## 5. Lineamientos de Diseño Visual (UX/UI: Kinetic Blueprint)

Todas las aplicaciones dentro de la suite compartida (CRM, Tracker, etc.) emplearán las mismas clases de componentes estructurales provistas por `@kodan-apps/ui-core/src/styles/base.css` (`.card`, `.btn`, `.input`, `.sidebar-link`, `.modal-overlay`, etc.). Cada aplicación define **su propia paleta de colores** mediante las variables CSS `:root`/`.theme-dark` en su `index.css` de entrada, lo que le otorga identidad visual única sin duplicar estilos estructurales.

### A. Tipografía Corporativa Unificada (Montserrat)
*   **Tipografía Exclusiva:** Se utilizará estrictamente la fuente geométrica sans-serif **Montserrat** para toda la interfaz visual de la plataforma (títulos, encabezados, cuerpo de texto, botones, campos de entrada, etiquetas de metadata, identificadores y tablas de datos). Queda prohibido el uso de JetBrains Mono o cualquier otra fuente complementaria para asegurar una uniformidad visual absoluta del 100%.

### B. Retícula, Spacing y Formas (Soft Aesthetic)
*   **Base Spacing:** Unidad base rígida de 4px (`gutter` de 24px y márgenes de 40px en Desktop).
*   **Radios de Esquina:**
    *   `rounded-sm` (4px / 0.25rem) para botones y campos de entrada (`input`).
    *   `rounded-md` (8px / 0.5rem) para contenedores primarios y tarjetas (`card`).
    *   `rounded-lg` (12px / 0.75rem) para modales emergentes y diálogos.
*   **Técnica de Doble Bisel (Doble Borde Premium):** Para evitar los bordes planos ordinarios de 1px gris, las tarjetas (`card`) y modales implementarán un bisel interior luminoso y una sombra difusa mediante la siguiente utilidad CSS:
    ```css
    .double-bevel-card {
      background: var(--surface-container-low);
      border: 1px solid var(--surface-container-high);
      box-shadow: 
        0 1px 0 0 rgba(255, 255, 255, 0.05) inset, /* Bisel interior superior */
        0 4px 12px -2px rgba(0, 0, 0, 0.3);         /* Sombra exterior difusa */
    }
    ```

### C. Sistema de Temas Unificado (Claro y Oscuro)

Cada aplicación define sus variables `:root` (tema claro) y `.theme-dark` (tema oscuro) en su propio `index.css`. La estructura de variables es consistente entre apps:

| Variable | Propósito |
|----------|-----------|
| `--sys-bg` | Fondo de página |
| `--sys-surface` | Fondo de contenedores secundarios |
| `--sys-surface-raised` | Fondo de tarjetas, modales, inputs |
| `--sys-surface-hover` | Hover de contenedores |
| `--sys-text` | Color de texto principal |
| `--sys-text-muted` | Color de texto secundario / etiquetas |
| `--sys-border` | Bordes de componentes |
| `--sys-border-soft` | Bordes suaves / separadores |
| `--sys-primary` | Color de acento de la app |
| `--sys-primary-container` | Fondo de acento (botones primarios) |
| `--sys-error` | Color de error |
| `--sys-error-container` | Fondo de mensajes de error |

Las aplicaciones comparten la misma estructura de componentes (`.card`, `.btn`, `.input`, etc.) pero cada una inyecta sus propios colores en estas variables, logrando identidad visual única sin duplicar estilos.

### D. Identidades Cromáticas por Aplicación (Acentuación Variable)
El acento de marca principal se define de forma dinámica en tiempo de renderizado cargando la clase raíz asociada a la aplicación activa:
1.  **kodanCRM (Acento Indigo/Blue):**
    *   *Modo Claro:* `--primary: #0059ba; --primary-container: #2372df; --on-primary: #ffffff;`
    *   *Modo Oscuro:* `--primary: #acc7ff; --primary-container: #0059ba; --on-primary: #002f67;`
2.  **kodanTRACKER (Acento Esmeralda/Green):**
    *   *Modo Claro:* `--primary: #00694e; --primary-container: #008563; --on-primary: #ffffff;`
    *   *Modo Oscuro:* `--primary: #83d7b5; --primary-container: #00694e; --on-primary: #003828;`

### E. Estrategia de Fuentes: Montserrat Subsetting + Fallback Nativo — **OPTIMIZADO PERFORMANCE**
*   **Problema:** Montserrat completo (18 pesos) = ~500 KB WOFF2; incluye glifos CJK/árabe/devanagari innecesarios para ES/PT/EN.
*   **Solución:** Subsetting latino (Basic Latin + Latin-1 Supplement + Latin Extended-A) ~95% cobertura.
*   **Pesos incluidos (4 archivos, ~64 KB total = -87%):**
    | Peso | Uso | Archivo |
    |------|-----|---------|
    | 400 | Body, UI text | `Montserrat-400-Latin.woff2` (~15 KB) |
    | 500 | Emphasis, labels | `Montserrat-500-Latin.woff2` (~16 KB) |
    | 600 | Semibold, headers | `Montserrat-600-Latin.woff2` (~16 KB) |
    | 700 | Bold, headlines | `Montserrat-700-Latin.woff2` (~17 KB) |
*   **CSS `@font-face` con `font-display: swap` + Fallback `system-ui`:**
    ```css
    :root {
      --font-sans: 'Montserrat-Latin', system-ui, -apple-system, BlinkMacSystemFont, 
                   'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
    }
    @font-face {
      font-family: 'Montserrat-Latin';
      src: url('/fonts/Montserrat-400-Latin.woff2') format('woff2');
      font-weight: 400; font-style: normal;
      font-display: swap;  /* Texto visible INMEDIATO con fallback nativo */
      unicode-range: U+0000-00FF, U+0100-017F, U+0180-024F, U+2000-206F, U+2070-209F, U+20A0-20CF;
    }
    /* Repetir para 500, 600, 700 */
    ```
*   **Preload Crítico (Above-the-Fold):** Solo 400 + 600 en `<head>`:
    ```html
    <link rel="preload" as="font" type="font/woff2" crossorigin href="/fonts/Montserrat-400-Latin.woff2">
    <link rel="preload" as="font" type="font/woff2" crossorigin href="/fonts/Montserrat-600-Latin.woff2">
    ```
*   **Vite:** Copia fuentes a `public/fonts/` en build (plugin `copy-fonts`).
*   **Tailwind:** `fontFamily: { sans: ['var(--font-sans)'] }`.
*   **Métricas objetivo:** FCP/LCP sin bloqueo, CLS ~0, transferencia fuentes 64 KB vs 500 KB.

---

## 6. Catálogo de Componentes Unificados (@kodan-apps/ui-core)

Todos los frontends utilizan el mismo catálogo de componentes UI definido en `packages/ui-core/`. La librería se compone de:

- **`src/styles/base.css`** — Clases CSS estructurales (`.card`, `.btn`, `.input`, `.sidebar-link`, `.modal-overlay`, `.glass-panel`) que usan `var(--sys-*)`. NO define valores de color — cada app los inyecta.
- **`src/components/`** — Componentes React compartidos (Card, Button, Input, Modal, Toaster).
- **`src/context/ThemeContext.tsx`** — `ThemeProvider` genérico que maneja light/dark mode con `localStorage`. Acepta `onThemeChange` opcional para persistir en servidor.

**Actualizaciones Optimistas (React 19 native `useOptimistic`):**
Para lograr una experiencia interactiva instantánea e ininterrumpida (Apple/Linear-tier), todas las transiciones de estado del Kanban (`KanbanBoard`), asignaciones de tareas y disparadores del cronómetro (`TimerWidget`) deben implementar obligatoriamente el hook `useOptimistic` de React 19. La interfaz del cliente asumirá la resolución exitosa inmediatamente al interactuar (ej: mover una tarjeta de Kanban o pulsar el botón de detener tiempo) mientras la petición de API se procesa de forma asíncrona en segundo plano, revirtiendo el estado únicamente ante un error del servidor.

### A. Componentes de Formulario e Interacción (Form Controls)
1.  **`Button.tsx` (Botón):** ✅ Implementado
    *   *Comportamiento:* Masa interactiva con micro-escalado (`active:scale-[0.97]` con transición de 150ms `cubic-bezier(0.32, 0.72, 0, 1)`). Spinner de carga integrado opcional y control deshabilitado (`disabled`).
2.  **`Input.tsx` / `Textarea.tsx` (Campo de Entrada):** ✅ Implementado
    *   *Comportamiento:* Radio de esquina de 4px (`rounded-sm`). En hover, resalta el borde a zinc intermedio. En focus, aplica borde `--primary` y una sombra de anillo exterior de 2px a 15% de opacidad.
3.  **`SearchableSelect.tsx` (Dropdown Simple con Buscador):**
    *   *Comportamiento:* Caja de selección simple que al abrirse despliega una sección de búsqueda en el header del menú flotante. Permite filtrado local en tiempo real y carga asíncrona de datos desde el backend (ej: asignación de cuentas o usuarios).
4.  **`MultiSearchableSelect.tsx` (Dropdown Múltiple con Buscador y Checkbox):**
    *   *Comportamiento:* Similar al dropdown simple, pero cada opción renderiza una casilla de verificación (`checkbox`). Muestra visualmente las opciones seleccionadas en badges acumulativos o un contador consolidado (ej: selector de múltiples responsables o tags).
5.  **`DatePicker.tsx` (Selector de Fecha):**
    *   *Comportamiento:* Selector interactivo tipo calendario flotante unificado, con control manual de meses y años y navegación rápida por teclado, consistente con el tema (claro/oscuro).
6.  **`DatePickerInline.tsx` (Selector de Rango de Fechas):**
    *   *Comportamiento:* Selector embebido directamente en la página para vistas de timeline, permitiendo arrastrar rangos de fecha rápidos.
7.  **`Checkbox.tsx` / `Toggle.tsx` (Controles de Selección):**
    *   *Comportamiento:* Controles de estado binario consistentes con el color de acento de la app.

### B. Componentes Estructurales y de Datos
8.  **`Card.tsx` (Tarjeta):** ✅ Implementado
    *   *Comportamiento:* Contenedor base con radio de 8px (`rounded-md`), técnica de doble bisel (borde de 1px en `#e6e8ea` para claro y `#272a2c` para oscuro) y elevación por capas cromáticas.
9.  **`Modal.tsx` (Ventana Emergente):** ✅ Implementado
    *   *Comportamiento:* Contenedor con radio de 12px (`rounded-lg`), centrado en pantalla, con fondo oscurecido (`backdrop-blur-md`). Animación de entrada de escala ligera (`scale-95` a `scale-100`).
10. **`Table.tsx` / `Pagination.tsx` (Tablas y Navegación):**
    *   *Comportamiento:* Tabla unificada con cabeceras en Montserrat (Label-SM en mayúsculas). Alternancia tonal de filas y paginador unificado con saltos rápidos de página.
11. **`CircularProgress.tsx` (Progreso Circular):**
    *   *Comportamiento:* Indicador de carga y porcentajes circulares SVG fluidos (ej: horas registradas vs capacidad semanal).
12. **`PlanUsageBadge.tsx` (Métrica de Cuotas):**
    *   *Comportamiento:* Badge de estado que evalúa el consumo local de cuota del tenant frente a los límites de `subscription_plans.limits`.

### C. Módulos de Tablero Kanban Genéricos
13. **`KanbanBoard.tsx` (Tablero Kanban):**
    *   *Comportamiento:* Componente contenedor que implementa la envoltura Drag-and-Drop (utilizando `@dnd-kit/core`). Gestiona los eventos de arrastre (`onDragEnd`) y actualiza el estado optimista en la interfaz del cliente de forma inmediata mientras persiste el cambio en el servidor.
14. **`KanbanColumn.tsx` (Columna de Tablero):**
    *   *Comportamiento:* Contenedor droppable de tarjetas. Su cabecera incluye un indicador circular (`dotColor`) personalizable, un badge con el nombre de la etapa en mayúsculas, y un badge con el recuento total de ítems o sumas financieras de la columna. Cambia el color de fondo en hover drag (`isOver`).
15. **`KanbanCard.tsx` (Tarjeta de Tablero):**
    *   *Comportamiento:* Elemento arrastrable de tipo tarjeta. Aplica elevación tonal, borde suave de 1px y sombra `Shadow-MD` en hover. Diseñado de forma genérica para renderizar tanto oportunidades comerciales en el CRM como tareas asignadas a proyectos en el Tracker.

---

## 7. Análisis de Código y Librerías de Terceros

### A. Reaprovechamiento vs Reescritura

#### 🟢 Código a Reaprovechar sin Modificación (o Mínima)
1.  **Lógica del Negocio CRM (Backend):** La base del CRUD de oportunidades (`opportunities`), etapas del pipeline, chat y gestor de tareas comerciales en `apps/api/src/CRM/`.
2.  **Lógica Financiera del TimeTracker (Backend):** Triggers de cálculo financiero de `time_entries` y agregación de métricas semanales en `apps/api/src/Tracker/`.
3.  **UI Componentes de Presentación (Frontend):** Vistas del chat, hilos de mensajes, grilla semanal y layout en React.

#### 🟡 Código a Modificar (Refactorización)
1.  **Control de Entidades e Identidad (Backend):** `UserRepository` se acopla a `user_tracker_profiles` para leer costos y cargos. `AuthController` valida licenciamientos por plan (`plan_limits.module`) y roles (`user_roles`).
2.  **Transición de Clientes a Cuentas (Tracker):** Cambiar `clients` y `client_id` por `accounts` y `account_id` en todos los modelos e interfaces frontend/backend.
3.  **Gestión de Contactos (Tracker):** Consumir contactos de la tabla unificada `contacts` y mapear puestos de trabajo desde el JSON.

#### 🔴 Código Nuevo a Implementar (De Cero)
1.  **Core Multi-Tenant y Seguridad:** `TenantResolver`, `BaseRepository` con middleware CSRF, y controladores de Super Admin.
2.  **Mecanismo Elástico de Búsqueda:** Sincronización en caliente del JSON `custom_fields` en la tabla `custom_field_values`.
3.  **Modal Oportunidad Ganada → Proyecto:** Conversión interactiva con triggers de API.

### B. Librerías de Terceros Recomendadas (React 19)
Para optimizar desarrollo y evitar código redundante, se establece el uso de:
*   **Drag-and-Drop:** `@dnd-kit/core` + `@dnd-kit/sortable` (Kanban boards).
*   **Selectores con Búsqueda:** `react-select` (SearchableSelect / MultiSearchableSelect).
*   **Fechas y Calendarios:** `react-day-picker` (DatePicker / DatePickerInline).
*   **Visualización de Datos:** `recharts` (Gráficos y reportes analíticos).
*   **Timeline y Recursos:** `@fullcalendar/react` + `@fullcalendar/resource-timeline` (Fila de recursos y cronograma).
*   **Notificaciones (Toasts):** `sonner` (Premium toasts compactos).
*   **Iconografía Vectorial:** `lucide-react` (Iconos SVG unificados).

---

## 8. Plan de Acción Atómico de Implementación (Fases de Codificación)

### Fase 1: Inicialización del Monorepo y Docker (Día 1)
*   [ ] Crear repositorio `kodanAPPS` con la estructura de directorios monorepo.
*   [ ] Configurar `package.json` raíz con npm workspaces.
*   [ ] Establecer entorno local usando `docker-compose.yml` (MariaDB, PHP, Apache/Nginx, Node).
*   [ ] Inicializar `apps/api` con Composer, PHPStan (Level 9) y Pest.

### Fase 2: Estructura de BD y Runner de Migraciones (Día 2)
*   [ ] Desarrollar `migrations/run.php` utilizando PDO nativo.
*   [ ] Implementar archivos SQL secuenciales (`001_core_schema.sql`, `002_module_schema.sql`, `003_custom_fields.sql`).
*   [ ] Validar creación correcta del esquema en la base de datos `admkoda_BBDD_APPS`.

### Fase 3: Core de Backend y Autenticación Unificada (Días 3 - 4)
*   [ ] Escribir middleware de resolución multi-tenant en PHP y el `BaseRepository` con control CSRF Double Submit.
*   [ ] Desarrollar `AuthController` con control estricto de login cruzado por `app_id`.
*   [ ] Implementar controladores del Super Admin para administración de tenants y planes.

### Fase 4: Portado y Refactorización de kodanCRM (Días 5 - 6)
*   [ ] Portar el backend de CRM a la estructura de la API unificada.
*   [ ] Refactorizar el frontend de CRM para conectarse a los nuevos endpoints, consumiendo los paquetes locales compartidos en `packages/`.
*   [ ] Desarrollar el modal interactivo de conversión Oportunidad Ganada → Proyecto.

### Fase 5: Portado y Refactorización de kodanTRACKER (Días 7 - 8)
*   [ ] Portar el backend de Tracker eliminando iniciativas y migrando de clientes a cuentas (`account_id`), vinculando perfiles a los IDs de cargo/seniority.
*   [ ] Refactorizar el frontend de Tracker eliminando UI de iniciativas y actualizando componentes de proyectos y cronómetro.

### Fase 6: Pruebas, Optimización y Despliegue (Días 9 - 10)
*   [ ] Ejecutar pruebas de seguridad de aislamiento de datos multi-tenant.
*   [ ] Realizar auditoría estática de código con PHPStan L9.
*   [ ] Compilar bundles de producción en frontends y validar despliegue unificado.

---

## 9. Protocolo de Despliegue — CI/CD Automatizado (GitHub Actions + SSH/rsync)

**NO se usa FTP manual.** Despliegue atómico, versionado y con rollback automático vía pipeline.

### Arquitectura de Despliegue

```
┌─────────────┐     ┌──────────────┐     ┌─────────────────────┐
│  Git Push   │────▶│ GitHub       │────▶│  cPanel Shared      │
│  (main)     │     │ Actions      │     │  Hosting (SSH)      │
└─────────────┘     │              │     │                     │
                    │ 1. Build     │     │ /home/usuario/      │
                    │ 2. Test      │     │ ├── kodanAPPS/      │
                    │ 3. Artifact  │     │ │   ├── releases/   │
                    │ 4. Deploy    │     │ │   │   ├── v1.2.3/ │
                    │    via SSH   │     │ │   │   └── v1.2.4/ │
                    └──────────────┘     │ │   ├── current     │──▶ symlink atómico
                                         │ │   └── shared/     │     (vendor, .env, storage)
                                         │ └── public_html/    │
                                         │     ├── api/        │──▶ current/public
                                         │     ├── crm/        │──▶ current/dist/crm
                                         │     └── tracker/    │──▶ current/dist/tracker
                                         └─────────────────────┘
```

### Pipeline GitHub Actions (`.github/workflows/deploy.yml`)

```yaml
name: Deploy to Production

on:
  push:
    branches: [main]
  workflow_dispatch:

env:
  PHP_VERSION: '8.3'
  NODE_VERSION: '20'
  SERVER_HOST: ${{ secrets.SERVER_HOST }}
  SERVER_USER: ${{ secrets.SERVER_USER }}
  SSH_KEY: ${{ secrets.SSH_PRIVATE_KEY }}
  DEPLOY_PATH: /home/usuario/kodanAPPS

jobs:
  build-and-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup PHP
        uses: shivammathur/setup-php@v2
        with:
          php-version: ${{ env.PHP_VERSION }}
          extensions: pdo, pdo_mysql, mbstring, xml, curl, zip, bcmath, gd, intl
          tools: composer:v2
          coverage: none
      
      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
      
      - name: Install PHP deps (api)
        run: |
          cd apps/api
          composer install --no-dev --optimize-autoloader --no-interaction
      
      - name: Run PHPStan Level 9
        run: |
          cd apps/api
          vendor/bin/phpstan analyse --level=9 --memory-limit=512M
      
      - name: Run Pest Tests
        run: |
          cd apps/api
          vendor/bin/pest --parallel
      
      - name: Install Node deps (monorepo)
        run: npm ci --workspaces --if-present
      
      - name: Build Frontends (crm + tracker)
        run: |
          npm run build --workspace=apps/crm
          npm run build --workspace=apps/tracker
      
      - name: Upload Artifact
        uses: actions/upload-artifact@v4
        with:
          name: release-${{ github.sha }}
          path: |
            apps/api/
            apps/crm/dist/
            apps/tracker/dist/
          retention-days: 30

  deploy:
    needs: build-and-test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - name: Download Artifact
        uses: actions/download-artifact@v4
        with:
          name: release-${{ github.sha }}
          path: release
      
      - name: Setup SSH
        uses: webfactory/ssh-agent@v0.9.0
        with:
          ssh-private-key: ${{ env.SSH_KEY }}
      
      - name: Deploy Atomic Release
        run: |
          TIMESTAMP=$(date +%Y%m%d%H%M%S)
          RELEASE_NAME="v${TIMESTAMP}-${GITHUB_SHA::7}"
          
          ssh -o StrictHostKeyChecking=no ${{ env.SERVER_USER }}@${{ env.SERVER_HOST }} "
            set -e
            mkdir -p ${{ env.DEPLOY_PATH }}/releases/${RELEASE_NAME}
            mkdir -p ${{ env.DEPLOY_PATH }}/shared/vendor
            mkdir -p ${{ env.DEPLOY_PATH }}/shared/storage
          "
          
          # rsync excluyendo vendor (se comparte) y .env (se comparte)
          rsync -az --delete \
            --exclude='vendor/' \
            --exclude='.env' \
            --exclude='storage/' \
            release/apps/api/ ${{ env.SERVER_USER }}@${{ env.SERVER_HOST }}:${{ env.DEPLOY_PATH }}/releases/${RELEASE_NAME}/
          
          rsync -az --delete \
            release/apps/crm/dist/ ${{ env.SERVER_USER }}@${{ env.SERVER_HOST }}:${{ env.DEPLOY_PATH }}/releases/${RELEASE_NAME}/dist/crm/
          
          rsync -az --delete \
            release/apps/tracker/dist/ ${{ env.SERVER_USER }}@${{ env.SERVER_HOST }}:${{ env.DEPLOY_PATH }}/releases/${RELEASE_NAME}/dist/tracker/
          
          # Enlazar shared y activar release (atómico)
          ssh ${{ env.SERVER_USER }}@${{ env.SERVER_HOST }} "
            set -e
            cd ${{ env.DEPLOY_PATH }}/releases/${RELEASE_NAME}
            ln -nfs ../../shared/vendor vendor
            ln -nfs ../../shared/.env .env
            ln -nfs ../../shared/storage storage
            
            # Composer dump-autoload en release (rápido, vendor ya existe)
            composer dump-autoload --optimize --no-dev
            
            # Migrations
            php migrations/run.php
            
            # Switch symlink atómico
            ln -nfs releases/${RELEASE_NAME} ${{ env.DEPLOY_PATH }}/current
            
            # Limpiar releases antiguas (mantener últimas 5)
            cd ${{ env.DEPLOY_PATH }}/releases && ls -t | tail -n +6 | xargs -r rm -rf
            
            # Reload PHP-FPM (si aplica) o clear opcache
            # systemctl reload php8.3-fpm  # solo si tienes acceso sudo
          "
      
      - name: Health Check
        run: |
          sleep 5
          curl -f https://api.kodan.software/api/health || exit 1
          curl -f https://crm.kodan.software/ || exit 1
          curl -f https://tracker.kodan.software/ || exit 1

  rollback:
    needs: deploy
    if: failure()
    runs-on: ubuntu-latest
    steps:
      - name: Rollback to Previous Release
        run: |
          ssh ${{ env.SERVER_USER }}@${{ env.SERVER_HOST }} "
            cd ${{ env.DEPLOY_PATH }}/releases
            PREV=\$(ls -t | head -2 | tail -1)
            ln -nfs releases/\$PREV ${{ env.DEPLOY_PATH }}/current
            echo 'Rollback completado a '\$PREV
          "
```

### Requisitos Previos en cPanel (Una sola vez)

1.  **Acceso SSH habilitado** en cPanel → *Terminal* o *SSH Access* → generar/autorizar clave pública.
2.  **Clave SSH en GitHub Secrets:** `SSH_PRIVATE_KEY` (clave privada), `SERVER_HOST`, `SERVER_USER`.
3.  **Directorio base creado:** `/home/usuario/kodanAPPS/` con subdirectorios `releases/`, `shared/`, `shared/vendor/`, `shared/storage/`.
4.  **`.env` en shared:** `/home/usuario/kodanAPPS/shared/.env` con credenciales BD (no en repo).
5.  **Subdominios en cPanel** apuntando a symlinks:
    *   `api.kodan.software` → `/home/usuario/kodanAPPS/current/public`
    *   `crm.kodan.software` → `/home/usuario/kodanAPPS/current/dist/crm`
    *   `tracker.kodan.software` → `/home/usuario/kodanAPPS/current/dist/tracker`
6.  **Cache Busting:** Vite genera `assets/index-[hash].js` automáticamente. **No hace falta script custom.** HTML tiene `<script src="/assets/index-[hash].js">`.

### Rollback Manual (Emergencia)
```bash
ssh usuario@servidor
cd /home/usuario/kodanAPPS/releases
ls -lt  # ver releases
ln -nfs releases/v20260614120000-abc1234 /home/usuario/kodanAPPS/current
```

---

## 10. Versiones Críticas Locked (Source of Truth)

| Componente | Versión | Archivo de Referencia |
|------------|---------|----------------------|
| **PHP** | `8.3+` | `apps/api/composer.json` → `"php": "^8.3"` |
| **MariaDB** | `10.11+` (CloudLinux) | Servidor verificado: `10.11.17-MariaDB-cll-lve` |
| **Node.js** | `20.x LTS` | `.nvmrc` + `package.json` → `"engines": {"node": ">=20.0.0"}` |
| **React** | `19.x` | `packages/ui-core/package.json` + apps → `"react": "^19.0.0"` |
| **Composer** | `2.x` | CI usa `composer:v2` |
| **npm** | `10.x` | Viene con Node 20 |
| **PHPStan** | `1.10+` Level 9 | `apps/api/phpstan.neon` → `level: 9` |
| **Pest** | `2.x` | `apps/api/composer.json` → `"pestphp/pest": "^2.0"` |
| **Vite** | `5.x` | `apps/*/package.json` → `"vite": "^5.0"` |
| **TypeScript** | `5.4+` | `tsconfig.json` → `"target": "ES2022"` |

> **Regla:** Versiones en `package.json`/`composer.json` son **source of truth**. Lockfiles (`package-lock.json`, `composer.lock`) **committed al repo**. CI falla si `npm ci` / `composer install` detectan drift.

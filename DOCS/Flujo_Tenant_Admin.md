# Flujo de Trabajo: Super Admin → Tenant Admin → Usuarios

## Lo que cambió (Migración 003)

Se eliminaron las tablas `tenant_apps` y `user_apps`. Ahora el **plan de suscripción** determina qué aplicaciones puede usar un tenant (vía `plan_limits.module`), y los roles se asignan por usuario por app en `user_roles` (FK al catálogo global `roles`).

El catálogo `apps` y `roles` lo gestiona el Super Admin desde su panel.

## Flujo completo

### 1. Super Admin crea un tenant

En el panel Super Admin → **Tenants** → "Nuevo Tenant":

1. **Paso 1 — Empresa**: ingresa nombre, selecciona plan (Free/Standard/Premium), sube logo.
2. **Paso 2 — Tema**: elige Light o Dark para el admin del tenant.
3. **Paso 3 — Admin**: ingresa nombre, email y contraseña del **primer usuario administrador del tenant**.

El backend hace esto automáticamente:
- Crea el tenant con `subscription_plan_id` = plan elegido.
- Consulta `plan_limits` para saber qué módulos incluye el plan (crm, tracker, etc.).
- Crea el usuario con los datos del paso 3.
- Le asigna rol **admin** en cada módulo que el plan incluya (vía `user_roles`).
- Guarda el tema elegido en `user_configs`.
- Registra auditoría.

> El Super Admin **no necesita roles en apps**. Solo accede al panel superadmin validando `is_super_admin=1` + `tenant_id=system`.

### 2. El admin del tenant accede a las apps

El usuario creado en el paso 3 inicia sesión en `crm.kodan.software` o `tracker.kodan.software` con su email y contraseña. El backend:

1. Verifica que el usuario existe y está activo.
2. Verifica que el tenant está activo.
3. Verifica que el plan del tenant incluye la app solicitada (`plan_limits.module = app_id`).
4. Verifica que el usuario tiene un rol en `user_roles` para esa app.
5. Si todo ok, emite JWT con `{ sub, tid, roles, app_id }`.

### 3. El admin del tenant crea más usuarios

Dentro de cada app, el admin (rol `admin`) puede crear usuarios y asignarles roles específicos:

- `admin` — acceso completo
- `pm` — gestor de proyectos
- `commercial` — ventas
- `staff` — equipo operativo (imputa horas)
- `viewer` — solo lectura

Cada usuario puede tener **un rol diferente por app**. Ej: usuario A = `admin` en crm + `viewer` en tracker.

Los roles disponibles los define el Super Admin globalmente en el panel → **Roles**.

## Diagrama de autorización (login)

```
Login(app_id, email, password)
  ├─ Usuario existe y active? → NO → 401
  ├─ Tenant activo? → NO → 403
  ├─ Plan tiene module = app_id? → NO → 403
  ├─ User tiene rol en user_roles para app_id? → NO → 403
  └─ OK → JWT { sub, tid, roles, app_id }
```
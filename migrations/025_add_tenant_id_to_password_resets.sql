-- ============================================================
-- 025: Agregar tenant_id a password_resets
-- ============================================================
-- Contexto: La migración 001_core_schema.sql ya incluye tenant_id
-- en la definición CREATE TABLE, pero la base de producción (creada
-- antes de ese cambio) no tiene la columna. Esta migración la agrega
-- para alinear el schema con el código de AuthController.
-- ============================================================

ALTER TABLE `password_resets`
  ADD COLUMN `tenant_id` BIGINT(20) NOT NULL DEFAULT 0
    COMMENT 'Requerido para evitar BYPASS_TENANT_SCOPE'
    AFTER `email`,
  ADD KEY `idx_tenant_id` (`tenant_id`);

-- Back-fill: asignar tenant_id a tokens existentes según el email del usuario
-- En producción solo hay 1 registro (superadmin@kodan.software → tenant_id=1)
UPDATE `password_resets` pr
  JOIN `users` u ON u.email = pr.email
  SET pr.`tenant_id` = u.`tenant_id`
  WHERE pr.`tenant_id` = 0;

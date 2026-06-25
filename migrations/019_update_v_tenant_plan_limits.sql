-- ============================================================
-- MIGRACIÓN 019: Actualizar v_tenant_plan_limits (Compat Layer)
-- ============================================================
-- Vista simplificada SIN lógica de override compleja.
-- La lógica de override (-1 bloqueado, 0 ilimitado) ahora vive
-- en PHP UsageTracker::getEffectiveLimit().
-- La vista es SOLO para reportes SQL legacy y compatibilidad.
-- ============================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

DROP VIEW IF EXISTS `v_tenant_plan_limits`;

CREATE OR REPLACE VIEW `v_tenant_plan_limits` AS
SELECT 
  t.`tenant_id`,
  t.`subscription_plan_id`,
  pl.`module`,
  pl.`metric`,
  pl.`value` AS `plan_limit`,
  pl.`is_blocked` AS `plan_blocked`,
  COALESCE(u.`current_value`, 0) AS `current_usage`,
  o.`custom_value` AS `override_value`,
  CASE 
    WHEN pl.`is_blocked` = 1 THEN 0
    WHEN pl.`value` = 0 THEN 1
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
LEFT JOIN `tenant_limit_overrides` o 
  ON o.`tenant_id` = t.`tenant_id` 
  AND o.`module` = pl.`module` 
  AND o.`metric` = pl.`metric`
WHERE t.`is_active` = 1 AND sp.`deleted_at` IS NULL;

SET FOREIGN_KEY_CHECKS = 1;

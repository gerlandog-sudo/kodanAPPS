-- ============================================================
-- MIGRACIÓN 021: Cross-App Config — Task Types multi-module
-- ============================================================
-- task_types: agrega columna module para separar catálogos
-- por app (crm, tracker, etc.)
-- ============================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

ALTER TABLE `task_types`
  ADD COLUMN `module` VARCHAR(50) NOT NULL DEFAULT 'crm' COMMENT 'App a la que pertenece (crm, tracker, etc.)' AFTER `tenant_id`;

SET FOREIGN_KEY_CHECKS = 1;

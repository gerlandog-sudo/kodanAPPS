-- ============================================================
-- MIGRACIÓN 005: Settings Features - Pipeline Manager + Custom Fields
-- ============================================================
-- Agrega columnas faltantes para:
-- - Pipeline stages: probability, ui_config (color presets)
-- - Custom field definitions: sort_order, deleted_at, multi_select type
-- ============================================================
-- Nota: Los errores "Duplicate column name" son ignorados por run.php

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ------------------------------------------------------------
-- 1. Pipeline Stages: Agregar probability y ui_config
-- ------------------------------------------------------------
ALTER TABLE `pipeline_stages`
  ADD COLUMN `probability` DECIMAL(5,2) NOT NULL DEFAULT 0.00 COMMENT 'Probabilidad de cierre %' AFTER `sort_order`,
  ADD COLUMN `ui_config` JSON DEFAULT NULL COMMENT 'Preset metadata: colorKey, dot, badgeClass, glowClass' AFTER `is_won_stage`;

-- ------------------------------------------------------------
-- 2. Custom Field Definitions: Agregar sort_order y deleted_at
-- ------------------------------------------------------------
ALTER TABLE `custom_field_definitions`
  ADD COLUMN `sort_order` INT(11) NOT NULL DEFAULT 0 COMMENT 'Orden de aparicion en formularios' AFTER `is_required`,
  ADD COLUMN `deleted_at` TIMESTAMP NULL DEFAULT NULL COMMENT 'Soft delete timestamp' AFTER `sort_order`;

-- ------------------------------------------------------------
-- 3. Custom Field Definitions: Extender ENUM field_type con multi_select
-- ------------------------------------------------------------
ALTER TABLE `custom_field_definitions`
  MODIFY `field_type` ENUM('text','number','select','multi_select','date','boolean') NOT NULL;

SET FOREIGN_KEY_CHECKS = 1;

-- ============================================================
-- MIGRACIÓN 006: Pipeline fixes - lost stage + archive
-- ============================================================
-- 1. is_lost_stage en pipeline_stages
-- 2. archived_at en opportunities
-- ============================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

ALTER TABLE `pipeline_stages`
  ADD COLUMN `is_lost_stage` TINYINT(1) NOT NULL DEFAULT 0 COMMENT 'Etapa de perdido' AFTER `is_won_stage`;

ALTER TABLE `opportunities`
  ADD COLUMN `archived_at` TIMESTAMP NULL DEFAULT NULL COMMENT 'Archivado (oculta del kanban activo)' AFTER `custom_fields`;

SET FOREIGN_KEY_CHECKS = 1;

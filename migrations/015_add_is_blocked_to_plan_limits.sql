-- ============================================================
-- MIGRACIÓN 015: Agregar is_blocked a plan_limits
-- ============================================================
-- Permite bloquear explícitamente un módulo/métrica independientemente del valor del límite
-- is_blocked = 1 → Bloquea acceso aunque value = 0 (ilimitado)
-- is_blocked = 0 → Comportamiento normal (default)
-- ============================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

ALTER TABLE `plan_limits`
ADD COLUMN `is_blocked` TINYINT(1) NOT NULL DEFAULT 0 
COMMENT 'TRUE = bloquea acceso independientemente del uso/límite' 
AFTER `value`;

SET FOREIGN_KEY_CHECKS = 1;

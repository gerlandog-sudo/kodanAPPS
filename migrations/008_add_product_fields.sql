-- ============================================================
-- MIGRACIÓN 008: Agregar descripción y estado a productos
-- ============================================================
-- Agrega campos de descripción comercial y estado activo/inactivo
-- a la tabla `products` para el catálogo del CRM.
-- ============================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

ALTER TABLE `products`
  ADD COLUMN `description` TEXT DEFAULT NULL AFTER `sku`,
  ADD COLUMN `is_active` TINYINT(1) NOT NULL DEFAULT 1 AFTER `price`;

SET FOREIGN_KEY_CHECKS = 1;

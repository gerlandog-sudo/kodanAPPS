-- ============================================================
-- MIGRACIÓN 002: Wizard Alta de Tenant
-- ============================================================
-- 1. Elimina slug de tenants (se usa solo tenant_id)
-- 2. Agrega logo_url (base64) para logo de empresa
-- ============================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

ALTER TABLE `tenants`
  DROP INDEX `uk_tenant_slug`,
  DROP COLUMN `slug`,
  ADD COLUMN `logo_url` TEXT NULL DEFAULT NULL AFTER `name`;

SET FOREIGN_KEY_CHECKS = 1;

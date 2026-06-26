-- ============================================================
-- MIGRACIÓN 024: Extensiones Tracker — projects, perfiles,
-- catálogos, campos personalizados y task_types
-- ============================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ============================================================
-- 1. Extender projects con campos de tracker
-- ============================================================
ALTER TABLE `projects`
  ADD COLUMN `description` TEXT DEFAULT NULL AFTER `name`,
  ADD COLUMN `color_hex` VARCHAR(7) DEFAULT '#00694e' AFTER `description`;

-- ============================================================
-- 2. Catálogo de posiciones (cargos)
-- ============================================================
CREATE TABLE IF NOT EXISTS `TRACKER_positions` (
  `id` BIGINT(20) NOT NULL AUTO_INCREMENT,
  `tenant_id` BIGINT(20) NOT NULL,
  `name` VARCHAR(100) NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP(),
  PRIMARY KEY (`id`),
  KEY `idx_positions_tenant` (`tenant_id`),
  CONSTRAINT `fk_positions_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`tenant_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 3. Catálogo de seniorities
-- ============================================================
CREATE TABLE IF NOT EXISTS `TRACKER_seniorities` (
  `id` BIGINT(20) NOT NULL AUTO_INCREMENT,
  `tenant_id` BIGINT(20) NOT NULL,
  `name` VARCHAR(100) NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP(),
  PRIMARY KEY (`id`),
  KEY `idx_seniorities_tenant` (`tenant_id`),
  CONSTRAINT `fk_seniorities_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`tenant_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 4. Perfiles de usuario del Tracker
-- ============================================================
CREATE TABLE IF NOT EXISTS `TRACKER_user_profiles` (
  `id` BIGINT(20) NOT NULL AUTO_INCREMENT,
  `tenant_id` BIGINT(20) NOT NULL,
  `user_id` BIGINT(20) NOT NULL,
  `position_id` BIGINT(20) DEFAULT NULL,
  `seniority_id` BIGINT(20) DEFAULT NULL,
  `hourly_cost` DECIMAL(10,2) NOT NULL DEFAULT 0.00 COMMENT 'Costo por hora del recurso',
  `weekly_capacity` INT(11) NOT NULL DEFAULT 2400 COMMENT 'Capacidad semanal en minutos (default 2400 = 40h)',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP(),
  `updated_at` TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_user_profile_tenant` (`tenant_id`, `user_id`),
  KEY `idx_user_profiles_user` (`user_id`),
  KEY `idx_user_profiles_position` (`position_id`),
  KEY `idx_user_profiles_seniority` (`seniority_id`),
  CONSTRAINT `fk_user_profiles_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`tenant_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_user_profiles_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_user_profiles_position` FOREIGN KEY (`position_id`) REFERENCES `TRACKER_positions` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_user_profiles_seniority` FOREIGN KEY (`seniority_id`) REFERENCES `TRACKER_seniorities` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 5. Extender entity_type de custom_field_definitions
-- ============================================================
ALTER TABLE `custom_field_definitions`
  MODIFY COLUMN `entity_type` ENUM('account','contact','opportunity','tracker_project','tracker_task') NOT NULL;

-- ============================================================
-- 6. Valores por defecto: posiciones y seniorities
-- ============================================================
-- Nota: el seed de task_types para module='tracker' se maneja
-- desde la app o se inserta manualmente por tenant.

SET FOREIGN_KEY_CHECKS = 1;

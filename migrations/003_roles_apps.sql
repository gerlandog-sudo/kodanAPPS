-- ============================================================
-- MIGRACIÓN 003: Roles & Apps — Plan‑based Access Control
-- ============================================================
-- 1. Crea catálogos apps y roles (globales, gestionados por Super Admin)
-- 2. Crea user_roles (reemplaza user_apps)
-- 3. Migra datos existentes de user_apps → user_roles
-- 4. Cambia plan_limits.module y tenant_plan_usage.module a VARCHAR
-- 5. Elimina tenant_apps y user_apps (plan determina acceso)
-- 6. Recrea v_tenant_plan_limits
-- ============================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ------------------------------------------------------------
-- 1. Catálogo de Aplicaciones
-- ------------------------------------------------------------
CREATE TABLE `apps` (
  `app_id` VARCHAR(50) NOT NULL,
  `name` VARCHAR(100) NOT NULL,
  `description` VARCHAR(255) DEFAULT NULL,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP(),
  PRIMARY KEY (`app_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `apps` (`app_id`, `name`, `description`) VALUES
('crm', 'kodanCRM', 'Customer Relationship Management'),
('tracker', 'kodanTracker', 'Time Tracking & Project Management');

-- ------------------------------------------------------------
-- 2. Catálogo Global de Roles (Super Admin gestiona)
-- ------------------------------------------------------------
CREATE TABLE `roles` (
  `id` BIGINT(20) UNSIGNED NOT NULL AUTO_INCREMENT,
  `app_id` VARCHAR(50) NOT NULL,
  `name` VARCHAR(50) NOT NULL,
  `description` VARCHAR(255) DEFAULT NULL,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_role_app_name` (`app_id`, `name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `roles` (`app_id`, `name`, `description`) VALUES
('crm', 'admin', 'Acceso completo CRM'),
('crm', 'pm', 'Gestor de proyectos CRM'),
('crm', 'commercial', 'Ventas y gestión de pipelines'),
('crm', 'staff', 'Acceso solo lectura CRM'),
('crm', 'viewer', 'Acceso externo solo lectura'),
('tracker', 'admin', 'Acceso completo Tracker'),
('tracker', 'pm', 'Gestor de proyectos Tracker'),
('tracker', 'commercial', 'Comercial Tracker'),
('tracker', 'staff', 'Miembro del equipo, imputación de horas'),
('tracker', 'viewer', 'Acceso externo solo lectura');

-- ------------------------------------------------------------
-- 3. Roles por Usuario por App (reemplaza user_apps)
-- ------------------------------------------------------------
CREATE TABLE `user_roles` (
  `user_id` BIGINT(20) NOT NULL,
  `app_id` VARCHAR(50) NOT NULL,
  `role_id` BIGINT(20) UNSIGNED NOT NULL,
  `assigned_by` BIGINT(20) DEFAULT NULL COMMENT 'User ID que asignó el rol',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP(),
  PRIMARY KEY (`user_id`, `app_id`),
  CONSTRAINT `fk_user_roles_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_user_roles_role` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Migrar datos existentes de user_apps → user_roles
INSERT INTO `user_roles` (`user_id`, `app_id`, `role_id`, `assigned_by`, `created_at`)
SELECT ua.`user_id`, ua.`app_id`, r.`id`, NULL, NOW()
FROM `user_apps` ua
JOIN `roles` r ON r.`app_id` = ua.`app_id` AND r.`name` = ua.`role`
WHERE ua.`is_active` = 1;

-- ------------------------------------------------------------
-- 4. plan_limits.module y tenant_plan_usage.module → VARCHAR
-- ------------------------------------------------------------
ALTER TABLE `plan_limits`
  MODIFY `module` VARCHAR(50) NOT NULL COMMENT 'Referencia a apps.app_id';

ALTER TABLE `tenant_plan_usage`
  MODIFY `module` VARCHAR(50) NOT NULL COMMENT 'Referencia a apps.app_id';

-- ------------------------------------------------------------
-- 5. Recrear v_tenant_plan_limits (columnas ahora VARCHAR)
-- ------------------------------------------------------------
DROP VIEW IF EXISTS `v_tenant_plan_limits`;

CREATE OR REPLACE VIEW `v_tenant_plan_limits` AS
SELECT 
  t.`tenant_id`,
  t.`subscription_plan_id`,
  pl.`module`,
  pl.`metric`,
  pl.`value` AS `limit_value`,
  COALESCE(u.`current_value`, 0) AS `current_usage`,
  CASE 
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
WHERE t.`is_active` = 1 AND sp.`deleted_at` IS NULL;

-- ------------------------------------------------------------
-- 6. Eliminar tablas obsoletas
-- ------------------------------------------------------------
DROP TABLE IF EXISTS `user_apps`;
DROP TABLE IF EXISTS `tenant_apps`;

SET FOREIGN_KEY_CHECKS = 1;

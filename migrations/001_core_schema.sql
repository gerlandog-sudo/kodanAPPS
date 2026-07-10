-- ============================================================
-- MIGRACIÓN 001: Esquema Core kodanAPPS (Super Admin)
-- ============================================================
-- Sin subscription_plans.limits JSON → usa plan_limits relacional
-- tenants: agregado is_system_tenant para tenant de control
-- Incluye: plan_limits, tenant_plan_usage, v_tenant_plan_limits
-- Incluye: refresh_tokens, password_resets, login_attempts
-- ============================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ------------------------------------------------------------
-- Planes de Suscripción (sin columna limits JSON)
-- ------------------------------------------------------------
CREATE TABLE `subscription_plans` (
  `id` BIGINT(20) UNSIGNED NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(100) NOT NULL,
  `description` TEXT DEFAULT NULL,
  `price` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  `currency` CHAR(3) NOT NULL DEFAULT 'USD',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP(),
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP() ON UPDATE CURRENT_TIMESTAMP(),
  `deleted_at` TIMESTAMP NULL DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- Límites por Plan y Módulo (Relacional, Tipado, Validable)
-- ------------------------------------------------------------
CREATE TABLE `plan_limits` (
  `id` BIGINT(20) UNSIGNED NOT NULL AUTO_INCREMENT,
  `plan_id` BIGINT(20) UNSIGNED NOT NULL,
  `module` ENUM('crm', 'tracker', 'api') NOT NULL COMMENT 'Módulo al que aplica el límite',
  `metric` VARCHAR(50) NOT NULL COMMENT 'Nombre de la métrica: pipelines_max, projects_max, users_max, storage_mb, api_calls_month, etc.',
  `value` INT(11) NOT NULL DEFAULT 0 COMMENT 'Valor del límite (0 = ilimitado)',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP(),
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP() ON UPDATE CURRENT_TIMESTAMP(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_plan_module_metric` (`plan_id`, `module`, `metric`),
  CONSTRAINT `fk_plan_limits_plan` FOREIGN KEY (`plan_id`) REFERENCES `subscription_plans` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- Tenants (Inquilinos) - Agregado is_system_tenant
-- ------------------------------------------------------------
CREATE TABLE `tenants` (
  `tenant_id` BIGINT(20) NOT NULL AUTO_INCREMENT,
  `slug` VARCHAR(50) NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `subscription_plan_id` BIGINT(20) UNSIGNED DEFAULT NULL,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `is_system_tenant` TINYINT(1) NOT NULL DEFAULT 0 COMMENT 'TRUE = tenant de control del sistema (Super Admin)',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP(),
  PRIMARY KEY (`tenant_id`),
  UNIQUE KEY `uk_tenant_slug` (`slug`),
  CONSTRAINT `fk_tenants_subscription` FOREIGN KEY (`subscription_plan_id`) REFERENCES `subscription_plans` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- Usuarios Globales (Identidad Transversal)
-- ------------------------------------------------------------
CREATE TABLE `users` (
  `id` BIGINT(20) NOT NULL AUTO_INCREMENT,
  `tenant_id` BIGINT(20) NOT NULL,
  `email` VARCHAR(255) NOT NULL,
  `password_hash` VARCHAR(255) NOT NULL,
  `display_name` VARCHAR(100) NOT NULL,
  `is_super_admin` TINYINT(1) NOT NULL DEFAULT 0,
  `language` VARCHAR(10) DEFAULT 'es_AR',
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_user_email_global` (`email`),
  KEY `idx_users_tenant_lookup` (`tenant_id`, `id`),
  CONSTRAINT `fk_users_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`tenant_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- Configuraciones de Usuario (Tema, Avatar)
-- ------------------------------------------------------------
CREATE TABLE `user_configs` (
  `user_id` BIGINT(20) NOT NULL,
  `app_id` VARCHAR(50) NOT NULL,
  `avatar_url` VARCHAR(255) DEFAULT NULL,
  `theme_colors` JSON DEFAULT NULL COMMENT 'ej: {"theme": "light" | "dark"}',
  PRIMARY KEY (`user_id`, `app_id`),
  CONSTRAINT `fk_user_configs_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- Configuraciones de Aplicación por Tenant
-- ------------------------------------------------------------
CREATE TABLE `app_configs` (
  `tenant_id` BIGINT(20) NOT NULL,
  `app_id` VARCHAR(50) NOT NULL,
  `config_key` VARCHAR(100) NOT NULL,
  `config_value` TEXT DEFAULT NULL,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP() ON UPDATE CURRENT_TIMESTAMP(),
  PRIMARY KEY (`tenant_id`, `app_id`, `config_key`),
  CONSTRAINT `fk_app_configs_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`tenant_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- Facturación de Tenants
-- ------------------------------------------------------------
CREATE TABLE `tenant_invoices` (
  `id` BIGINT(20) NOT NULL AUTO_INCREMENT,
  `tenant_id` BIGINT(20) NOT NULL,
  `amount` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  `status` ENUM('pending', 'paid', 'overdue') NOT NULL DEFAULT 'pending',
  `due_date` DATE NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP(),
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_invoices_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`tenant_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- Uso de Límites por Tenant (Contadores Atómicos)
-- ------------------------------------------------------------
CREATE TABLE `tenant_plan_usage` (
  `tenant_id` BIGINT(20) NOT NULL,
  `module` ENUM('crm', 'tracker', 'api') NOT NULL,
  `metric` VARCHAR(50) NOT NULL COMMENT 'Referencia a plan_limits.metric',
  `current_value` BIGINT(20) NOT NULL DEFAULT 0 COMMENT 'Contador atómico (UPDATE ... SET current_value = current_value + 1)',
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP() ON UPDATE CURRENT_TIMESTAMP(),
  PRIMARY KEY (`tenant_id`, `module`, `metric`),
  CONSTRAINT `fk_usage_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`tenant_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- Vista: Límites en Tiempo Real (Tenant + Plan + Uso)
-- ------------------------------------------------------------
CREATE OR REPLACE VIEW `v_tenant_plan_limits` AS
SELECT 
  t.`tenant_id`,
  t.`subscription_plan_id`,
  pl.`module`,
  pl.`metric`,
  pl.`value` AS `limit_value`,
  COALESCE(u.`current_value`, 0) AS `current_usage`,
  CASE 
    WHEN pl.`value` = 0 THEN 1  -- 0 = ilimitado
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
-- Seguridad: Intentos de Login (Rate Limiting)
-- ------------------------------------------------------------
CREATE TABLE `login_attempts` (
  `id` BIGINT(20) NOT NULL AUTO_INCREMENT,
  `email` VARCHAR(255) NOT NULL,
  `ip_address` VARCHAR(45) NOT NULL,
  `attempted_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP(),
  PRIMARY KEY (`id`),
  KEY `idx_la_email_ip` (`email`, `ip_address`, `attempted_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- Seguridad: Reset de Contraseña (Token Hasheado)
-- ------------------------------------------------------------
CREATE TABLE `password_resets` (
  `email` VARCHAR(255) NOT NULL,
  `tenant_id` BIGINT(20) NOT NULL DEFAULT 0 COMMENT 'Requerido para evitar BYPASS_TENANT_SCOPE',
  `token_hash` VARCHAR(255) NOT NULL COMMENT 'bcrypt/argon2(token_raw) — NUNCA guardar token en texto plano',
  `expires_at` DATETIME NOT NULL COMMENT 'TTL 15-30 min desde creación',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP(),
  PRIMARY KEY (`email`),
  KEY `idx_tenant_id` (`tenant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- Seguridad: Refresh Tokens con Rotación Obligatoria
-- ------------------------------------------------------------
CREATE TABLE `refresh_tokens` (
  `id` BIGINT(20) UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` BIGINT(20) NOT NULL,
  `tenant_id` BIGINT(20) NOT NULL,
  `token_hash` VARCHAR(255) NOT NULL COMMENT 'bcrypt/argon2(token_raw)',
  `user_agent` VARCHAR(500) DEFAULT NULL,
  `ip_address` VARCHAR(45) DEFAULT NULL,
  `expires_at` DATETIME NOT NULL COMMENT 'now() + 30 días (sliding window)',
  `revoked_at` DATETIME DEFAULT NULL,
  `replaced_by_token_id` BIGINT(20) UNSIGNED DEFAULT NULL COMMENT 'Chain de rotación para detección de reuso',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_rt_user_active` (`user_id`, `revoked_at`, `expires_at`),
  KEY `idx_rt_token_hash` (`token_hash`),
  CONSTRAINT `fk_rt_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_rt_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`tenant_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_rt_replaced` FOREIGN KEY (`replaced_by_token_id`) REFERENCES `refresh_tokens` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- Auditoría Global
-- ------------------------------------------------------------
CREATE TABLE `audit_logs` (
  `id` BIGINT(20) NOT NULL AUTO_INCREMENT,
  `tenant_id` BIGINT(20) NOT NULL COMMENT '0 = sistema (Super Admin)',
  `user_id` BIGINT(20) DEFAULT NULL,
  `action` VARCHAR(255) NOT NULL,
  `details` TEXT DEFAULT NULL COMMENT 'JSON con before/after/target_id',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP(),
  PRIMARY KEY (`id`),
  KEY `idx_audit_tenant_action` (`tenant_id`, `action`, `created_at`),
  CONSTRAINT `fk_audit_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`tenant_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- Trigger: Prohibir DELETE en tenant de sistema (is_system_tenant = TRUE)
-- ------------------------------------------------------------
DELIMITER $$

CREATE TRIGGER `trg_tenants_prevent_system_delete`
BEFORE DELETE ON `tenants`
FOR EACH ROW
BEGIN
    IF OLD.`is_system_tenant` = 1 THEN
        SIGNAL SQLSTATE '45000' 
        SET MESSAGE_TEXT = 'Cannot delete system tenant (is_system_tenant = TRUE). Use soft delete (is_active = 0).';
    END IF;
END$$

DELIMITER ;

SET FOREIGN_KEY_CHECKS = 1;
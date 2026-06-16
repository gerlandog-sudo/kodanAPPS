-- ============================================================
-- MIGRACIÓN 004: Vista Previa de Tabla Proyectos de Tracker
-- ============================================================
-- Habilita la integración CRM -> Tracker (Ganar Oportunidad -> Proyecto)
-- ============================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

CREATE TABLE IF NOT EXISTS `projects` (
  `id` BIGINT(20) NOT NULL AUTO_INCREMENT,
  `tenant_id` BIGINT(20) NOT NULL,
  `account_id` BIGINT(20) NOT NULL,
  `opportunity_id` BIGINT(20) DEFAULT NULL,
  `name` VARCHAR(255) NOT NULL,
  `budget_hours` DECIMAL(10,2) DEFAULT NULL,
  `status` ENUM('active', 'paused', 'completed') NOT NULL DEFAULT 'active',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_opportunity_project` (`opportunity_id`),
  CONSTRAINT `fk_projects_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`tenant_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_projects_account` FOREIGN KEY (`account_id`) REFERENCES `accounts` (`account_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_projects_opportunity` FOREIGN KEY (`opportunity_id`) REFERENCES `opportunities` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;

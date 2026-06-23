-- ============================================================
-- MIGRACIÓN 012: Workflow Automation (Reglas + Ejecuciones)
-- ============================================================
SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ------------------------------------------------------------
-- Reglas de Workflow
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `workflow_rules` (
  `id` BIGINT(20) NOT NULL AUTO_INCREMENT,
  `tenant_id` BIGINT(20) NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `description` TEXT DEFAULT NULL,
  `trigger_entity` ENUM('opportunity', 'task') NOT NULL DEFAULT 'opportunity',
  `trigger_event` VARCHAR(50) NOT NULL,
  `trigger_conditions` JSON NOT NULL,
  `actions` JSON NOT NULL,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `execution_order` INT(11) NOT NULL DEFAULT 0,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP(),
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP() ON UPDATE CURRENT_TIMESTAMP(),
  PRIMARY KEY (`id`),
  KEY `idx_wf_tenant_trigger` (`tenant_id`, `trigger_entity`, `trigger_event`),
  CONSTRAINT `fk_workflow_rules_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`tenant_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- Log de Ejecuciones de Workflow
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `workflow_executions` (
  `id` BIGINT(20) NOT NULL AUTO_INCREMENT,
  `tenant_id` BIGINT(20) NOT NULL,
  `rule_id` BIGINT(20) NOT NULL,
  `trigger_entity` ENUM('opportunity', 'task') NOT NULL,
  `trigger_entity_id` BIGINT(20) NOT NULL,
  `status` ENUM('success', 'partial', 'failed') NOT NULL DEFAULT 'success',
  `executed_actions` JSON NOT NULL,
  `error_message` TEXT DEFAULT NULL,
  `executed_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP(),
  PRIMARY KEY (`id`),
  KEY `idx_we_rule` (`rule_id`),
  KEY `idx_we_entity` (`trigger_entity`, `trigger_entity_id`),
  KEY `idx_we_tenant_time` (`tenant_id`, `executed_at`),
  CONSTRAINT `fk_we_rule` FOREIGN KEY (`rule_id`) REFERENCES `workflow_rules` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_we_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`tenant_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;

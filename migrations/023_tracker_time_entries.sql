-- ============================================================
-- MIGRACIÓN 023: Time entries + Summary diario del Tracker
-- ============================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- -----------------------------------------------------------
-- TRACKER_time_entries: registro de horas trabajadas
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS `TRACKER_time_entries` (
  `id` BIGINT(20) NOT NULL AUTO_INCREMENT,
  `tenant_id` BIGINT(20) NOT NULL,
  `project_id` BIGINT(20) NOT NULL,
  `task_id` BIGINT(20) DEFAULT NULL,
  `user_id` BIGINT(20) NOT NULL,
  `date` DATE NOT NULL,
  `duration_minutes` INT(11) NOT NULL COMMENT 'Duración en minutos',
  `description` TEXT DEFAULT NULL,
  `hourly_cost` DECIMAL(10,2) NOT NULL DEFAULT 0.00 COMMENT 'Costo/hora del usuario al momento del registro',
  `calculated_cost` DECIMAL(10,2) NOT NULL DEFAULT 0.00 COMMENT '(hourly_cost / 60) * duration_minutes',
  `approval_status` ENUM('draft','submitted','approved','rejected') NOT NULL DEFAULT 'draft',
  `submitted_at` TIMESTAMP NULL DEFAULT NULL,
  `approved_by` BIGINT(20) DEFAULT NULL,
  `approved_at` TIMESTAMP NULL DEFAULT NULL,
  `rejected_reason` TEXT DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP(),
  `updated_at` TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP(),
  PRIMARY KEY (`id`),
  KEY `idx_time_entries_tenant` (`tenant_id`),
  KEY `idx_time_entries_project` (`project_id`),
  KEY `idx_time_entries_task` (`task_id`),
  KEY `idx_time_entries_user` (`user_id`),
  KEY `idx_time_entries_date` (`date`),
  KEY `idx_time_entries_status` (`approval_status`),
  KEY `idx_time_entries_user_date` (`user_id`, `date`),
  KEY `idx_time_entries_project_date` (`project_id`, `date`),
  CONSTRAINT `fk_time_entries_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`tenant_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_time_entries_project` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_time_entries_task` FOREIGN KEY (`task_id`) REFERENCES `TRACKER_project_tasks` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_time_entries_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_time_entries_approved_by` FOREIGN KEY (`approved_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------
-- TRACKER_summary_daily: agregado diario por usuario/proyecto
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS `TRACKER_summary_daily` (
  `id` BIGINT(20) NOT NULL AUTO_INCREMENT,
  `tenant_id` BIGINT(20) NOT NULL,
  `user_id` BIGINT(20) NOT NULL,
  `project_id` BIGINT(20) NOT NULL,
  `date` DATE NOT NULL,
  `total_minutes` INT(11) NOT NULL DEFAULT 0,
  `calculated_cost` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP(),
  `updated_at` TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_summary_user_project_date` (`user_id`, `project_id`, `date`),
  KEY `idx_summary_tenant` (`tenant_id`),
  KEY `idx_summary_user` (`user_id`),
  KEY `idx_summary_project` (`project_id`),
  CONSTRAINT `fk_summary_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`tenant_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_summary_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_summary_project` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;

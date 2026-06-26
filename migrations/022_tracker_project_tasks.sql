-- ============================================================
-- MIGRACIÓN 022: Tabla de tareas kanban del Tracker
-- ============================================================
-- TRACKER_project_tasks: tareas del tablero kanban por proyecto,
-- vinculadas a task_types con module='tracker'.
-- ============================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

CREATE TABLE IF NOT EXISTS `TRACKER_project_tasks` (
  `id` BIGINT(20) NOT NULL AUTO_INCREMENT,
  `tenant_id` BIGINT(20) NOT NULL,
  `project_id` BIGINT(20) NOT NULL,
  `task_type_id` BIGINT(20) DEFAULT NULL,
  `title` VARCHAR(255) NOT NULL,
  `description` TEXT DEFAULT NULL,
  `assigned_to` BIGINT(20) DEFAULT NULL,
  `kanban_status` ENUM('todo','in_progress','review','done') NOT NULL DEFAULT 'todo',
  `position` INT(11) NOT NULL DEFAULT 0,
  `priority` ENUM('low','medium','high','critical') NOT NULL DEFAULT 'medium',
  `start_date` DATE DEFAULT NULL,
  `due_date` DATE DEFAULT NULL,
  `estimated_hours` DECIMAL(10,2) DEFAULT NULL,
  `created_by` BIGINT(20) NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP(),
  `updated_at` TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP(),
  PRIMARY KEY (`id`),
  KEY `idx_project_tasks_tenant` (`tenant_id`),
  KEY `idx_project_tasks_project` (`project_id`),
  KEY `idx_project_tasks_assigned` (`assigned_to`),
  KEY `idx_project_tasks_status` (`kanban_status`),
  KEY `idx_project_tasks_position` (`project_id`, `kanban_status`, `position`),
  CONSTRAINT `fk_project_tasks_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`tenant_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_project_tasks_project` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_project_tasks_task_type` FOREIGN KEY (`task_type_id`) REFERENCES `task_types` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_project_tasks_assigned` FOREIGN KEY (`assigned_to`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_project_tasks_created_by` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;

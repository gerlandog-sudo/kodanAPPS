-- ============================================================
-- MIGRACIÓN 016: Nueva tabla app_metrics
-- ============================================================
-- Catálogo de métricas configurables por app (en lugar de hardcodeadas)
-- Permite a Super Admin agregar/editar métricas sin modificar código
-- ============================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

CREATE TABLE `app_metrics` (
  `app_id` VARCHAR(50) NOT NULL,
  `metric` VARCHAR(50) NOT NULL,
  `label` VARCHAR(100) NOT NULL,
  `description` TEXT DEFAULT NULL,
  `metric_type` ENUM('limit_entity', 'counter_usage') NOT NULL DEFAULT 'limit_entity',
  `default_value` INT NOT NULL DEFAULT 0,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `sort_order` INT NOT NULL DEFAULT 0,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP(),
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP() ON UPDATE CURRENT_TIMESTAMP(),
  PRIMARY KEY (`app_id`, `metric`),
  CONSTRAINT `fk_app_metrics_app` FOREIGN KEY (`app_id`) REFERENCES `apps`(`app_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Seed data CRM
INSERT INTO `app_metrics` (`app_id`, `metric`, `label`, `metric_type`, `default_value`, `sort_order`) VALUES
('crm', 'users_max', 'Usuarios máximos', 'limit_entity', 10, 1),
('crm', 'negotiations_max', 'Negociaciones activas', 'limit_entity', 100, 2),
('crm', 'pipelines_max', 'Pipelines', 'limit_entity', 5, 3),
('crm', 'accounts_max', 'Cuentas', 'limit_entity', 500, 4),
('crm', 'contacts_max', 'Contactos', 'limit_entity', 2000, 5),
('crm', 'api_calls_month', 'Llamadas API/mes', 'counter_usage', 10000, 10);

-- Seed data Tracker
INSERT INTO `app_metrics` (`app_id`, `metric`, `label`, `metric_type`, `default_value`, `sort_order`) VALUES
('tracker', 'users_max', 'Usuarios máximos', 'limit_entity', 5, 1),
('tracker', 'projects_max', 'Proyectos activos', 'limit_entity', 20, 2),
('tracker', 'tasks_max', 'Tareas activas', 'limit_entity', 500, 3),
('tracker', 'time_entries_max', 'Registros tiempo/mes', 'limit_entity', 1000, 4),
('tracker', 'api_calls_month', 'Llamadas API/mes', 'counter_usage', 5000, 10);

SET FOREIGN_KEY_CHECKS = 1;

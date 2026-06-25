-- ============================================================
-- MIGRACIÓN 018: Nueva tabla tenant_recount_schedule
-- ============================================================
-- Cola de reconciliación lazy para recuento de contadores
-- El UsageTracker PHP inserta registros cuando detecta drift >= 80%
-- y procesa la cola via fastcgi_finish_request / shutdown function
-- ============================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

CREATE TABLE `tenant_recount_schedule` (
  `tenant_id` BIGINT(20) NOT NULL,
  `module` VARCHAR(50) NOT NULL,
  `scheduled_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP(),
  PRIMARY KEY (`tenant_id`, `module`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;

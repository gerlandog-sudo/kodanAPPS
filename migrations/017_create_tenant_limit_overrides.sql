-- ============================================================
-- MIGRACIÓN 017: Nueva tabla tenant_limit_overrides
-- ============================================================
-- Permite a Super Admin establecer valores custom de límites por tenant
-- custom_value = -1 → Bloqueado explícitamente
-- custom_value = 0  → Ilimitado
-- custom_value > 0  → Valor custom del límite
-- ============================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

CREATE TABLE `tenant_limit_overrides` (
  `tenant_id` BIGINT(20) NOT NULL,
  `module` VARCHAR(50) NOT NULL COMMENT 'Referencia a apps.app_id',
  `metric` VARCHAR(50) NOT NULL,
  `custom_value` INT NOT NULL COMMENT '-1=bloqueado, 0=ilimitado, >0=valor custom',
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP() ON UPDATE CURRENT_TIMESTAMP(),
  PRIMARY KEY (`tenant_id`, `module`, `metric`),
  CONSTRAINT `fk_override_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`tenant_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_override_app` FOREIGN KEY (`module`) REFERENCES `apps`(`app_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;

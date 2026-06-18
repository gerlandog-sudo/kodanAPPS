-- Migración 007: Eliminar tabla refresh_tokens (JWT simple sin refresh)
-- Ver DOCS/kodanAPPS BluePrint.md sección C para justificación

DROP TABLE IF EXISTS `refresh_tokens`;
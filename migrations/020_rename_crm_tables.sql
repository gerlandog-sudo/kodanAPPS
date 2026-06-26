/* ========================================================================
   MIGRACION 020: Renombrar 12 tablas exclusivas del CRM con prefijo CRM_
   ========================================================================
   Estrategia conservadora:
     1. DROP FOREIGN KEY desde tablas transversales que referencian tablas
        que serán renombradas (solo projects.fk_projects_opportunity).
     2. RENAME TABLE x12 (InnoDB actualiza automáticamente los FK dentro
        de las propias tablas renombradas).
     3. RECREAR FK dropeados apuntando al nuevo nombre.
   ======================================================================== */

-- =====================================================================
-- PASO 1: Dropear FK desde tablas transversales hacia tablas CRM
-- =====================================================================
ALTER TABLE `projects` DROP FOREIGN KEY IF EXISTS `fk_projects_opportunity`;

-- =====================================================================
-- PASO 2: Renombrar las 12 tablas CRM
-- =====================================================================
RENAME TABLE
  `opportunities`          TO `CRM_opportunities`,
  `opportunity_line_items` TO `CRM_opportunity_line_items`,
  `pipelines`              TO `CRM_pipelines`,
  `pipeline_stages`        TO `CRM_pipeline_stages`,
  `email_templates`        TO `CRM_email_templates`,
  `quotes`                 TO `CRM_quotes`,
  `quote_line_items`       TO `CRM_quote_line_items`,
  `workflow_rules`         TO `CRM_workflow_rules`,
  `workflow_executions`    TO `CRM_workflow_executions`,
  `tasks`                  TO `CRM_tasks`,
  `task_history_logs`      TO `CRM_task_history_logs`,
  `task_participants`      TO `CRM_task_participants`;

-- =====================================================================
-- PASO 3: Recrear FK dropeados apuntando a los nuevos nombres
-- =====================================================================
ALTER TABLE `projects`
  ADD CONSTRAINT `fk_projects_opportunity`
  FOREIGN KEY (`opportunity_id`) REFERENCES `CRM_opportunities` (`id`)
  ON DELETE SET NULL;

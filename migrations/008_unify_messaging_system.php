<?php
/**
 * Migration 008: Unificación del Sistema de Mensajería Transversal - kodanAPPS
 * 
 * Este script de migración PHP independiente:
 * 1. Crea la tabla 'conversations' (sustituyendo 'message_threads').
 * 2. Crea la tabla 'conversation_participants'.
 * 3. Modifica y unifica la tabla 'messages'.
 * 4. Migra el historial existente del CRM sin pérdida de información.
 * 5. Elimina las columnas y constraints acopladas al CRM en la tabla 'messages'.
 */

declare(strict_types=1);

$envPath = __DIR__ . '/../apps/api/.env';
$dotenv = [];
if (file_exists($envPath)) {
    $lines = file($envPath, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    if (is_array($lines)) {
        foreach ($lines as $line) {
            $line = trim($line);
            if ($line === '' || str_starts_with($line, '#')) {
                continue;
            }
            $parts = explode('=', $line, 2);
            if (count($parts) === 2) {
                $key = trim($parts[0]);
                $val = trim($parts[1]);
                $val = trim($val, '"\'');
                $dotenv[$key] = $val;
            }
        }
    }
}

$config = [
    'host' => getenv('DB_HOST') ?: ($dotenv['DB_HOST'] ?? '127.0.0.1'),
    'port' => (int)(getenv('DB_PORT') ?: ($dotenv['DB_PORT'] ?? 3306)),
    'dbname' => getenv('DB_NAME') ?: ($dotenv['DB_NAME'] ?? 'admkoda_BBDD_APPS'),
    'user' => 'admkoda_APPS_admin',
    'pass' => 'admin2026',
    'charset' => 'utf8mb4',
];

$dsn = "mysql:host={$config['host']};port={$config['port']};dbname={$config['dbname']};charset={$config['charset']}";

try {
    echo "Connecting to database at {$config['host']}:{$config['port']}...\n";
    $pdo = new PDO($dsn, $config['user'], $config['pass'], [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_EMULATE_PREPARES => false,
    ]);
    echo "✅ Database connection successful.\n";

    // 1. Crear tabla centralizada de conversaciones si no existe
    echo "Creating 'conversations' table...\n";
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS `conversations` (
          `id` BIGINT(20) UNSIGNED NOT NULL AUTO_INCREMENT,
          `tenant_id` BIGINT(20) NOT NULL,
          `type` ENUM('direct', 'group', 'entity') NOT NULL DEFAULT 'entity',
          `entity_type` VARCHAR(50) DEFAULT NULL,
          `entity_id` BIGINT(20) UNSIGNED DEFAULT NULL,
          `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP(),
          PRIMARY KEY (`id`),
          KEY `idx_conv_tenant` (`tenant_id`),
          UNIQUE KEY `uk_tenant_entity` (`tenant_id`, `entity_type`, `entity_id`),
          CONSTRAINT `fk_conversations_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`tenant_id`) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    ");

    // 2. Crear tabla de participantes de conversaciones
    echo "Creating 'conversation_participants' table...\n";
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS `conversation_participants` (
          `conversation_id` BIGINT(20) UNSIGNED NOT NULL,
          `user_id` BIGINT(20) NOT NULL,
          `joined_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP(),
          `last_read_message_id` BIGINT(20) UNSIGNED DEFAULT NULL,
          PRIMARY KEY (`conversation_id`, `user_id`),
          KEY `fk_cp_user` (`user_id`),
          CONSTRAINT `fk_cp_conversation` FOREIGN KEY (`conversation_id`) REFERENCES `conversations` (`id`) ON DELETE CASCADE,
          CONSTRAINT `fk_cp_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    ");

    // 3. Migrar datos existentes desde 'message_threads' a 'conversations'
    $hasThreadsTable = $pdo->query("SHOW TABLES LIKE 'message_threads'")->rowCount() > 0;
    $hasLegacyMigrated = false;

    if ($hasThreadsTable) {
        echo "Migrating message threads to conversations...\n";
        
        // Comprobamos si ya se han migrado datos para no duplicar
        $existingCount = (int) $pdo->query("SELECT COUNT(*) FROM conversations WHERE entity_type = 'crm_opportunity'")->fetchColumn();
        
        if ($existingCount === 0) {
            // Mapeamos message_threads -> conversations
            $pdo->exec("
                INSERT INTO `conversations` (`id`, `tenant_id`, `type`, `entity_type`, `entity_id`, `created_at`)
                SELECT `id`, `tenant_id`, 'entity', 'crm_opportunity', `opportunity_id`, `created_at`
                FROM `message_threads`
            ");
            
            // Suscribir automáticamente al owner de la oportunidad a su respectiva conversación
            $pdo->exec("
                INSERT IGNORE INTO `conversation_participants` (`conversation_id`, `user_id`)
                SELECT c.`id`, o.`owner_user_id`
                FROM `conversations` c
                JOIN `opportunities` o ON o.`id` = c.`entity_id`
                WHERE c.`entity_type` = 'crm_opportunity' AND o.`owner_user_id` IS NOT NULL
            ");

            // Suscribir automáticamente a los usuarios que hayan enviado mensajes en ese thread
            $pdo->exec("
                INSERT IGNORE INTO `conversation_participants` (`conversation_id`, `user_id`)
                SELECT DISTINCT `thread_id`, `user_id`
                FROM `messages`
                WHERE `thread_id` IS NOT NULL
            ");

            echo "✅ Historical threads and participants migrated successfully.\n";
            $hasLegacyMigrated = true;
        } else {
            echo "⚠️ Legacy threads already migrated. Skipping migration step.\n";
        }
    }

    // 4. Modificar la tabla 'messages' para adaptarla a la nueva arquitectura
    echo "Modifying 'messages' table structures...\n";
    
    // Comprobar si ya existe la columna 'conversation_id'
    $columns = $pdo->query("SHOW COLUMNS FROM `messages` LIKE 'conversation_id'")->fetchAll();
    if (empty($columns)) {
        // Añadir columna conversation_id
        $pdo->exec("ALTER TABLE `messages` ADD COLUMN `conversation_id` BIGINT(20) UNSIGNED DEFAULT NULL AFTER `tenant_id`");
        
        if ($hasLegacyMigrated) {
            // Rellenar conversation_id con thread_id
            $pdo->exec("UPDATE `messages` SET `conversation_id` = `thread_id` WHERE `thread_id` IS NOT NULL");
        }
    }

    // Añadir columna 'is_system'
    $isSystemCol = $pdo->query("SHOW COLUMNS FROM `messages` LIKE 'is_system'")->fetchAll();
    if (empty($isSystemCol)) {
        $pdo->exec("ALTER TABLE `messages` ADD COLUMN `is_system` TINYINT(1) NOT NULL DEFAULT 0");
    }

    // Añadir columna 'system_metadata'
    $metadataCol = $pdo->query("SHOW COLUMNS FROM `messages` LIKE 'system_metadata'")->fetchAll();
    if (empty($metadataCol)) {
        $pdo->exec("ALTER TABLE `messages` ADD COLUMN `system_metadata` JSON DEFAULT NULL");
    }

    // Eliminar las restricciones de claves foráneas anteriores del CRM si existen
    echo "Dropping legacy message constraints...\n";
    $constraints = [
        'fk_messages_opportunity',
        'fk_messages_thread',
        'fk_messages_user'
    ];

    foreach ($constraints as $constraint) {
        try {
            $pdo->exec("ALTER TABLE `messages` DROP FOREIGN KEY `{$constraint}`");
        } catch (PDOException $e) {
            // Ignorar si no existe el constraint
        }
    }

    // Comprobar si existe la columna 'user_id' para modificarla y renombrarla
    $userCol = $pdo->query("SHOW COLUMNS FROM `messages` LIKE 'user_id'")->fetchAll();
    if (!empty($userCol)) {
        // Adaptar columna user_id para soportar nulos (mensajes de sistema)
        $pdo->exec("ALTER TABLE `messages` MODIFY `user_id` BIGINT(20) NULL");
        // Renombrar columna user_id a sender_id
        $pdo->exec("ALTER TABLE `messages` CHANGE COLUMN `user_id` `sender_id` BIGINT(20) NULL");
    }

    // Comprobar si existe la columna 'body' para renombrarla a 'content'
    $bodyCol = $pdo->query("SHOW COLUMNS FROM `messages` LIKE 'body'")->fetchAll();
    if (!empty($bodyCol)) {
        $pdo->exec("ALTER TABLE `messages` CHANGE COLUMN `body` `content` TEXT NOT NULL");
    }

    // Añadir nuevas restricciones y claves foráneas de forma segura
    echo "Applying unified constraints and indexes to 'messages'...\n";
    try {
        $pdo->exec("ALTER TABLE `messages` ADD CONSTRAINT `fk_messages_conversation` FOREIGN KEY (`conversation_id`) REFERENCES `conversations` (`id`) ON DELETE CASCADE");
    } catch (PDOException $e) {
        // Ignorar si la FK ya existe
    }
    
    try {
        $pdo->exec("ALTER TABLE `messages` ADD CONSTRAINT `fk_messages_sender` FOREIGN KEY (`sender_id`) REFERENCES `users` (`id`) ON DELETE SET NULL");
    } catch (PDOException $e) {
        // Ignorar si la FK ya existe
    }
    
    try {
        $pdo->exec("ALTER TABLE `messages` ADD INDEX `idx_msg_conv_created` (`conversation_id`, `created_at` DESC)");
    } catch (PDOException $e) {
        // Ignorar si el índice ya existe
    }

    // Limpieza: Eliminar columnas obsoletas si existen
    $threadCol = $pdo->query("SHOW COLUMNS FROM `messages` LIKE 'thread_id'")->fetchAll();
    if (!empty($threadCol)) {
        $pdo->exec("ALTER TABLE `messages` DROP COLUMN `thread_id`");
    }

    $oppCol = $pdo->query("SHOW COLUMNS FROM `messages` LIKE 'opportunity_id'")->fetchAll();
    if (!empty($oppCol)) {
        $pdo->exec("ALTER TABLE `messages` DROP COLUMN `opportunity_id`");
    }

    // Eliminar tabla legacy 'message_threads'
    if ($hasThreadsTable) {
        echo "Dropping legacy 'message_threads' table...\n";
        $pdo->exec("DROP TABLE IF EXISTS `message_threads`");
    }

    // 5. Ajustar la tabla 'message_attachments' para el nuevo campo messages.id unificado
    echo "Updating 'message_attachments' table constraints...\n";
    try {
        $pdo->exec("ALTER TABLE `message_attachments` DROP FOREIGN KEY `fk_attachments_message`");
    } catch (PDOException $e) {
        // Ignorar si no existe
    }
    $pdo->exec("ALTER TABLE `message_attachments` ADD CONSTRAINT `fk_attachments_message` FOREIGN KEY (`message_id`) REFERENCES `messages` (`id`) ON DELETE CASCADE");

    // Asegurar que la restricción UNIQUE KEY exista en la tabla conversations si ya fue creada anteriormente
    echo "Ensuring unique key on 'conversations'...\n";
    try {
        $pdo->exec("ALTER TABLE `conversations` ADD UNIQUE KEY `uk_tenant_entity` (`tenant_id`, `entity_type`, `entity_id`)");
    } catch (PDOException $e) {
        // Ignorar si el índice único ya existe
    }

    echo "✅ Migration completed successfully!\n";

} catch (Throwable $e) {
    die("❌ Error during migration: " . $e->getMessage() . "\n");
}

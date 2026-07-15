<?php

declare(strict_types=1);

namespace kodanAPPS\Repositories;

use kodanAPPS\DB\HubSQLiteConnection;
use PDO;

/**
 * HubRepository - Acceso a datos de kodanHUB (SQLite).
 *
 * Gestiona las tablas: apps, ai_catalog, app_services, logs, settings, translations.
 * NO extiende BaseRepository porque SQLite no usa tenant-awareness.
 */
final class HubRepository
{
    private PDO $db;

    public function __construct()
    {
        $this->db = HubSQLiteConnection::getInstance();
    }

    // ============================================================
    // APPS
    // ============================================================

    /** @return array{data: array, total: int, page: int, limit: int, total_pages: int} */
    public function getApps(int $page = 1, int $limit = 10, bool $showArchived = false): array
    {
        $offset = ($page - 1) * $limit;
        $whereClause = $showArchived ? '1=1' : "status != 'archived'";

        $total = $this->db->query("SELECT COUNT(*) FROM apps WHERE {$whereClause}")->fetchColumn();

        $stmt = $this->db->prepare("
            SELECT a.*, 
            (SELECT SUM(tokens_in + tokens_out) FROM logs WHERE app_id = a.id) as app_tokens,
            (SELECT COUNT(*) FROM logs WHERE app_id = a.id) as app_requests
            FROM apps a 
            WHERE {$whereClause}
            ORDER BY a.created_at DESC
            LIMIT :limit OFFSET :offset
        ");
        $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
        $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
        $stmt->execute();

        return [
            'data' => $stmt->fetchAll(),
            'total' => (int)$total,
            'page' => $page,
            'limit' => $limit,
            'total_pages' => (int)ceil($total / $limit),
        ];
    }

    public function getAppById(int $id): ?array
    {
        $stmt = $this->db->prepare('SELECT * FROM apps WHERE id = :id');
        $stmt->execute(['id' => $id]);
        $result = $stmt->fetch();
        return $result ?: null;
    }

    public function getAppByToken(string $token): ?array
    {
        $stmt = $this->db->prepare('SELECT * FROM apps WHERE token = :token');
        $stmt->execute(['token' => trim($token)]);
        $result = $stmt->fetch();
        return $result ?: null;
    }

    public function getAppByAppId(string $appId): ?array
    {
        $stmt = $this->db->prepare('SELECT * FROM apps WHERE app_id = :app_id');
        $stmt->execute(['app_id' => trim($appId)]);
        $result = $stmt->fetch();
        return $result ?: null;
    }

    public function createApp(array $data): int
    {
        $stmt = $this->db->prepare('
            INSERT INTO apps (app_id, name, token, status, app_identifier)
            VALUES (:app_id, :name, :token, :status, :app_identifier)
        ');
        $stmt->execute([
            'app_id' => $data['app_id'] ?? null,
            'name' => $data['name'] ?? 'Nueva App',
            'token' => $data['token'] ?? '',
            'status' => $data['status'] ?? 'active',
            'app_identifier' => $data['app_identifier'] ?? null,
        ]);
        return (int)$this->db->lastInsertId();
    }

    public function updateApp(int $id, array $data): int
    {
        $fields = [];
        $params = ['id' => $id];
        foreach (['name', 'token', 'old_token', 'status', 'app_identifier'] as $col) {
            if (array_key_exists($col, $data)) {
                $fields[] = "{$col} = :{$col}";
                $params[$col] = $data[$col];
            }
        }
        if (empty($fields)) return 0;
        $sql = 'UPDATE apps SET ' . implode(', ', $fields) . ' WHERE id = :id';
        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        return $stmt->rowCount();
    }

    public function toggleAppStatus(int $id): void
    {
        $this->db->exec("
            UPDATE apps SET status = CASE WHEN status = 'active' THEN 'inactive' ELSE 'active' END WHERE id = {$id}
        ");
    }

    public function archiveApp(int $id): void
    {
        $this->db->prepare('UPDATE apps SET status = :status WHERE id = :id')
            ->execute(['status' => 'archived', 'id' => $id]);
        $this->db->prepare('DELETE FROM app_services WHERE app_id = :app_id')
            ->execute(['app_id' => $id]);
    }

    // ============================================================
    // AI CATALOG
    // ============================================================

    /** @return array{data: array, total: int, page: int, limit: int, total_pages: int} */
    public function getCatalog(int $page = 1, int $limit = 10): array
    {
        $offset = ($page - 1) * $limit;
        $total = $this->db->query('SELECT COUNT(*) FROM ai_catalog')->fetchColumn();
        $stmt = $this->db->prepare('
            SELECT * FROM ai_catalog ORDER BY provider ASC, name ASC LIMIT :limit OFFSET :offset
        ');
        $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
        $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
        $stmt->execute();

        return [
            'data' => $stmt->fetchAll(),
            'total' => (int)$total,
            'page' => $page,
            'limit' => $limit,
            'total_pages' => (int)ceil($total / $limit),
        ];
    }

    public function getCatalogById(int $id): ?array
    {
        $stmt = $this->db->prepare('SELECT * FROM ai_catalog WHERE id = :id');
        $stmt->execute(['id' => $id]);
        $result = $stmt->fetch();
        return $result ?: null;
    }

    public function createCatalogEntry(array $data): int
    {
        $stmt = $this->db->prepare('
            INSERT INTO ai_catalog (provider, name, identifier, protocol, endpoint, is_active)
            VALUES (:provider, :name, :identifier, :protocol, :endpoint, :is_active)
        ');
        $stmt->execute([
            'provider' => $data['provider'] ?? '',
            'name' => $data['name'] ?? '',
            'identifier' => $data['identifier'] ?? '',
            'protocol' => $data['protocol'] ?? 'openai-v1',
            'endpoint' => $data['endpoint'] ?? '',
            'is_active' => $data['is_active'] ?? 1,
        ]);
        return (int)$this->db->lastInsertId();
    }

    public function updateCatalogEntry(int $id, array $data): int
    {
        $fields = [];
        $params = ['id' => $id];
        foreach (['provider', 'name', 'identifier', 'protocol', 'endpoint', 'is_active'] as $col) {
            if (array_key_exists($col, $data)) {
                $fields[] = "{$col} = :{$col}";
                $params[$col] = $data[$col];
            }
        }
        if (empty($fields)) return 0;
        $sql = 'UPDATE ai_catalog SET ' . implode(', ', $fields) . ' WHERE id = :id';
        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        return $stmt->rowCount();
    }

    public function deleteCatalogEntry(int $id): int
    {
        $stmt = $this->db->prepare('DELETE FROM ai_catalog WHERE id = :id');
        $stmt->execute(['id' => $id]);
        return $stmt->rowCount();
    }

    // ============================================================
    // APP SERVICES (Junction)
    // ============================================================

    /** @return array{data: array, total: int, page: int, limit: int, total_pages: int} */
    public function getServices(int $page = 1, int $limit = 10): array
    {
        $offset = ($page - 1) * $limit;
        $total = $this->db->query('SELECT COUNT(*) FROM app_services')->fetchColumn();
        $stmt = $this->db->prepare("
            SELECT s.*, a.name as app_name, c.name as model_name, c.provider 
            FROM app_services s 
            JOIN apps a ON s.app_id = a.id 
            JOIN ai_catalog c ON s.catalog_id = c.id 
            ORDER BY a.name ASC, s.priority ASC
            LIMIT :limit OFFSET :offset
        ");
        $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
        $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
        $stmt->execute();

        return [
            'data' => $stmt->fetchAll(),
            'total' => (int)$total,
            'page' => $page,
            'limit' => $limit,
            'total_pages' => (int)ceil($total / $limit),
        ];
    }

    /** @return array<int, array<string, mixed>> */
    public function getAppServices(int $appId): array
    {
        $stmt = $this->db->prepare("
            SELECT s.*, c.protocol, c.identifier, c.endpoint, c.provider 
            FROM app_services s 
            JOIN ai_catalog c ON s.catalog_id = c.id 
            WHERE s.app_id = :app_id AND s.is_active = 1 
            ORDER BY s.priority ASC
        ");
        $stmt->execute(['app_id' => $appId]);
        return $stmt->fetchAll();
    }

    public function getServiceById(int $id): ?array
    {
        $stmt = $this->db->prepare("
            SELECT s.*, c.protocol, c.identifier, c.endpoint, c.provider 
            FROM app_services s 
            JOIN ai_catalog c ON s.catalog_id = c.id 
            WHERE s.id = :id
        ");
        $stmt->execute(['id' => $id]);
        $result = $stmt->fetch();
        return $result ?: null;
    }

    public function createService(array $data): int
    {
        $stmt = $this->db->prepare('
            INSERT INTO app_services (app_id, catalog_id, api_key, priority, is_active, config_json)
            VALUES (:app_id, :catalog_id, :api_key, :priority, :is_active, :config_json)
        ');
        $stmt->execute([
            'app_id' => $data['app_id'] ?? 0,
            'catalog_id' => $data['catalog_id'] ?? 0,
            'api_key' => $data['api_key'] ?? '',
            'priority' => $data['priority'] ?? 1,
            'is_active' => $data['is_active'] ?? 1,
            'config_json' => $data['config_json'] ?? '{}',
        ]);
        return (int)$this->db->lastInsertId();
    }

    public function updateService(int $id, array $data): int
    {
        $fields = [];
        $params = ['id' => $id];
        foreach (['app_id', 'catalog_id', 'api_key', 'priority', 'is_active', 'config_json'] as $col) {
            if (array_key_exists($col, $data)) {
                $fields[] = "{$col} = :{$col}";
                $params[$col] = $data[$col];
            }
        }
        if (empty($fields)) return 0;
        $sql = 'UPDATE app_services SET ' . implode(', ', $fields) . ' WHERE id = :id';
        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        return $stmt->rowCount();
    }

    public function deleteService(int $id): int
    {
        $stmt = $this->db->prepare('DELETE FROM app_services WHERE id = :id');
        $stmt->execute(['id' => $id]);
        return $stmt->rowCount();
    }

    // ============================================================
    // LOGS
    // ============================================================

    public function saveLog(int $appId, string $model, int $tokensIn, int $tokensOut, float $latency, string $status): int
    {
        $stmt = $this->db->prepare('
            INSERT INTO logs (app_id, model, tokens_in, tokens_out, latency, status, service)
            VALUES (:app_id, :model, :tokens_in, :tokens_out, :latency, :status, :service)
        ');
        $stmt->execute([
            'app_id' => $appId,
            'model' => $model,
            'tokens_in' => $tokensIn,
            'tokens_out' => $tokensOut,
            'latency' => $latency,
            'status' => $status,
            'service' => $model,
        ]);
        return (int)$this->db->lastInsertId();
    }

    /** @return array<string, mixed> */
    public function getStats(): array
    {
        $tokens = $this->db->query("SELECT SUM(tokens_in + tokens_out) FROM logs")->fetchColumn() ?: 0;
        $reqs = $this->db->query("SELECT COUNT(*) FROM logs")->fetchColumn() ?: 0;
        $appsCount = $this->db->query("SELECT COUNT(*) FROM apps WHERE status = 'active'")->fetchColumn() ?: 0;
        $hour = $this->db->query("SELECT COUNT(*) FROM logs WHERE timestamp >= datetime('now', '-1 hour')")->fetchColumn() ?: 0;
        $errors = $this->db->query("SELECT COUNT(*) FROM logs WHERE status = 'error'")->fetchColumn() ?: 0;

        $apps = $this->db->query("
            SELECT a.id, a.name,
            (SELECT SUM(tokens_in + tokens_out) FROM logs WHERE app_id = a.id) as app_tokens,
            (SELECT COUNT(*) FROM logs WHERE app_id = a.id) as app_requests
            FROM apps a
        ")->fetchAll();

        return [
            'tokens' => number_format((float)$tokens),
            'requests' => number_format((float)$reqs),
            'apps_active' => $appsCount,
            'hour' => number_format((float)$hour),
            'errors' => number_format((float)$errors),
            'apps_grid' => $apps,
        ];
    }

    /** @return array<string, mixed> */
    public function getConsumptionStats(array $filters, int $page = 1, int $limit = 15): array
    {
        $offset = ($page - 1) * $limit;
        $where = ['1=1'];
        $params = [];

        if (!empty($filters['app_id'])) {
            $where[] = 'l.app_id = :app_id';
            $params['app_id'] = $filters['app_id'];
        }
        if (!empty($filters['status'])) {
            $where[] = 'l.status = :status';
            $params['status'] = $filters['status'];
        }
        if (!empty($filters['date_from'])) {
            $where[] = 'l.timestamp >= :date_from';
            $params['date_from'] = $filters['date_from'] . ' 00:00:00';
        }
        if (!empty($filters['date_to'])) {
            $where[] = 'l.timestamp <= :date_to';
            $params['date_to'] = $filters['date_to'] . ' 23:59:59';
        }

        $whereStr = implode(' AND ', $where);

        $totals = $this->db->prepare("
            SELECT 
                SUM(tokens_in + tokens_out) as total_tokens,
                COUNT(*) as total_requests,
                AVG(latency) as avg_latency,
                SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as total_success
            FROM logs l WHERE {$whereStr}
        ");
        $totals->execute($params);
        $totalsData = $totals->fetch();

        $totalRows = $this->db->prepare("SELECT COUNT(*) FROM logs l WHERE {$whereStr}");
        $totalRows->execute($params);
        $totalCount = $totalRows->fetchColumn();

        $dataStmt = $this->db->prepare("
            SELECT l.*, a.name as app_name 
            FROM logs l 
            LEFT JOIN apps a ON l.app_id = a.id 
            WHERE {$whereStr} 
            ORDER BY l.timestamp DESC 
            LIMIT :limit OFFSET :offset
        ");
        $dataStmt->bindValue(':limit', $limit, PDO::PARAM_INT);
        $dataStmt->bindValue(':offset', $offset, PDO::PARAM_INT);
        // Re-enlazar parámetros de filtros
        foreach ($params as $key => $val) {
            $dataStmt->bindValue(":{$key}", $val);
        }
        $dataStmt->execute();

        return [
            'totals' => [
                'tokens' => number_format((float)($totalsData['total_tokens'] ?: 0)),
                'requests' => number_format((float)($totalsData['total_requests'] ?: 0)),
                'latency' => round((float)($totalsData['avg_latency'] ?: 0), 3) . 's',
                'efficiency' => $totalsData['total_requests'] > 0
                    ? round(($totalsData['total_success'] / $totalsData['total_requests']) * 100, 1) . '%'
                    : '0%',
            ],
            'data' => $dataStmt->fetchAll(),
            'total' => (int)$totalCount,
            'page' => $page,
            'limit' => $limit,
            'total_pages' => (int)ceil((int)$totalCount / $limit),
        ];
    }

    /** @return array{data: array, total: int, page: int, limit: int, total_pages: int} */
    public function getErrors(int $page = 1, int $limit = 10): array
    {
        $offset = ($page - 1) * $limit;
        $total = $this->db->query("SELECT COUNT(*) FROM logs WHERE status = 'error'")->fetchColumn();
        $stmt = $this->db->prepare("
            SELECT l.*, a.name as app_name 
            FROM logs l 
            LEFT JOIN apps a ON l.app_id = a.id 
            WHERE l.status = 'error' 
            ORDER BY l.timestamp DESC 
            LIMIT :limit OFFSET :offset
        ");
        $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
        $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
        $stmt->execute();

        return [
            'data' => $stmt->fetchAll(),
            'total' => (int)$total,
            'page' => $page,
            'limit' => $limit,
            'total_pages' => (int)ceil($total / $limit),
        ];
    }

    // ============================================================
    // SETTINGS
    // ============================================================

    public function getSetting(string $key): ?string
    {
        $stmt = $this->db->prepare('SELECT value FROM settings WHERE key = :key');
        $stmt->execute(['key' => $key]);
        $result = $stmt->fetch();
        return $result ? $result['value'] : null;
    }

    public function setSetting(string $key, string $value): void
    {
        $stmt = $this->db->prepare('UPDATE settings SET value = :value WHERE key = :key');
        $stmt->execute(['key' => $key, 'value' => $value]);
        if ($stmt->rowCount() === 0) {
            $this->db->prepare('INSERT INTO settings (key, value) VALUES (:key, :value)')
                ->execute(['key' => $key, 'value' => $value]);
        }
    }
}

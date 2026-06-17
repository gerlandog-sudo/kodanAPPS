<?php

namespace kodanAPPS\Repositories;

/**
 * @extends BaseRepository<array<string, mixed>>
 */
class ProjectRepository extends BaseRepository
{
    protected const TABLE = 'projects';

    /**
     * Lista todos los proyectos con tenant scope automático.
     *
     * @param array<string, mixed> $params
     * @return array<int, array<string, mixed>>
     */
    public function findAll(string $table = self::TABLE, string $columns = '*', string $where = '', array $params = [], string $orderBy = '', int $limit = 0): array
    {
        return parent::findAll($table, $columns, $where, $params, $orderBy, $limit);
    }

    /**
     * Busca un proyecto por ID con tenant scope automático.
     *
     * @return array<string, mixed>|null
     */
    public function findById(int $id): ?array
    {
        return $this->findOne(self::TABLE, 'id = :id', [':id' => $id]);
    }
}

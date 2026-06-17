<?php

namespace kodanAPPS\Controllers;

use kodanAPPS\Repositories\ProjectRepository;
use RuntimeException;

class TrackerController
{
    public function __construct(
        private ProjectRepository $projectRepo,
    ) {}

    /**
     * GET /api/tracker/projects
     */
    public function listProjects(): array
    {
        return $this->projectRepo->findAll();
    }

    /**
     * GET /api/tracker/projects/{id}
     */
    public function getProject(int $id): array
    {
        $project = $this->projectRepo->findById($id);
        if ($project === null) {
            throw new RuntimeException('Proyecto no encontrado.', 404);
        }
        return $project;
    }
}

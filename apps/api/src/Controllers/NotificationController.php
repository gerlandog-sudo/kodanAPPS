<?php

declare(strict_types=1);

namespace kodanAPPS\Controllers;

use kodanAPPS\Repositories\NotificationRepository;
use kodanAPPS\DB\TenantContext;

final class NotificationController
{
    private NotificationRepository $notificationRepo;

    public function __construct(NotificationRepository $notificationRepo)
    {
        $this->notificationRepo = $notificationRepo;
    }

    /**
     * GET /api/crm/notifications
     * 
     * @return array<int, array<string, mixed>>
     */
    public function list(): array
    {
        $userId = TenantContext::getUserId();
        
        // Sincronizar alertas dinámicamente antes de retornar la lista
        $this->syncSmartNotifications($userId);

        return $this->notificationRepo->listAllForUser($userId);
    }

    /**
     * POST /api/crm/notifications/mark-read
     * 
     * @param array{ids?: array<int>} $input
     * @return array{success: bool, affected: int, message: string}
     */
    public function markRead(array $input): array
    {
        $userId = TenantContext::getUserId();
        $ids = $input['ids'] ?? [];

        if (empty($ids)) {
            $affected = $this->notificationRepo->markAllAsRead($userId);
            $message = 'Todas las notificaciones marcadas como leídas.';
        } else {
            $affected = $this->notificationRepo->markAsRead($userId, array_map('intval', $ids));
            $message = 'Notificaciones marcadas como leídas.';
        }

        return [
            'success' => true,
            'affected' => $affected,
            'message' => $message
        ];
    }

    /**
     * POST /api/crm/notifications/clear
     * 
     * @return array{success: bool, affected: int, message: string}
     */
    public function clearAll(): array
    {
        $userId = TenantContext::getUserId();
        $affected = $this->notificationRepo->clearAll($userId);

        return [
            'success' => true,
            'affected' => $affected,
            'message' => 'Notificaciones eliminadas exitosamente.'
        ];
    }

    /**
     * Ejecuta las reglas de negocio para detectar oportunidades estancadas y fechas vencidas
     */
    private function syncSmartNotifications(int $userId): void
    {
        // 1. Eliminar alertas que ya no aplican o fueron resueltas
        $this->notificationRepo->removeStaleAlerts($userId);

        // 2. Obtener oportunidades activas del usuario
        $opportunities = $this->notificationRepo->getActiveOpportunitiesForUser($userId);

        $today = new \DateTime();
        $stalledThreshold = (new \DateTime())->modify('-15 days');

        foreach ($opportunities as $opp) {
            $oppId = (int)$opp['id'];
            $title = $opp['title'];

            // Regla A: Fecha de cierre vencida
            if (!empty($opp['close_date'])) {
                $todayDateStr = $today->format('Y-m-d');
                if ($opp['close_date'] < $todayDateStr) {
                    $this->notificationRepo->upsertNotification([
                        'user_id' => $userId,
                        'type' => 'overdue_close',
                        'entity_type' => 'crm_opportunity',
                        'entity_id' => $oppId,
                        'title' => 'Fecha de cierre vencida',
                        'message' => "La negociación \"{$title}\" ha superado su fecha de cierre proyectada ({$opp['close_date']}).",
                        'is_read' => 0
                    ]);
                }
            }

            // Regla B: Negociación estancada (sin cambios en 15 días)
            if (!empty($opp['updated_at'])) {
                $updatedAt = new \DateTime($opp['updated_at']);
                if ($updatedAt < $stalledThreshold) {
                    $days = $updatedAt->diff($today)->days;
                    $this->notificationRepo->upsertNotification([
                        'user_id' => $userId,
                        'type' => 'stalled_deal',
                        'entity_type' => 'crm_opportunity',
                        'entity_id' => $oppId,
                        'title' => 'Negociación estancada',
                        'message' => "La negociación \"{$title}\" no ha registrado actividad durante los últimos {$days} días.",
                        'is_read' => 0
                    ]);
                }
            }
        }
    }
}

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
     * GET /api/crm/notifications/config
     * 
     * @return array{stalled_deal_days: int}
     */
    public function getConfig(): array
    {
        $days = (int)$this->notificationRepo->getAppConfig('stalled_deal_days', '15');
        return [
            'stalled_deal_days' => $days
        ];
    }

    /**
     * POST /api/crm/notifications/config
     * 
     * @param array{stalled_deal_days: int} $input
     * @return array{success: bool, message: string}
     */
    public function saveConfig(array $input): array
    {
        $days = isset($input['stalled_deal_days']) ? (int)$input['stalled_deal_days'] : 15;
        if ($days <= 0) {
            $days = 15;
        }

        $this->notificationRepo->setAppConfig('stalled_deal_days', (string)$days);

        return [
            'success' => true,
            'message' => 'Configuración de alertas guardada exitosamente.'
        ];
    }

    /**
     * Ejecuta las reglas de negocio para detectar oportunidades estancadas y fechas vencidas
     */
    private function syncSmartNotifications(int $userId): void
    {
        // Obtener el límite de días configurado (por defecto 15)
        $days = (int)$this->notificationRepo->getAppConfig('stalled_deal_days', '15');

        // 1. Eliminar alertas que ya no aplican o fueron resueltas
        $this->notificationRepo->removeStaleAlerts($userId, $days);

        // 2. Obtener oportunidades activas del usuario
        $opportunities = $this->notificationRepo->getActiveOpportunitiesForUser($userId);

        $today = new \DateTime();
        $stalledThreshold = (new \DateTime())->modify("-{$days} days");

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

            // Regla B: Negociación estancada (sin cambios en X días)
            if (!empty($opp['updated_at'])) {
                $updatedAt = new \DateTime($opp['updated_at']);
                if ($updatedAt < $stalledThreshold) {
                    $actualDays = $updatedAt->diff($today)->days;
                    $this->notificationRepo->upsertNotification([
                        'user_id' => $userId,
                        'type' => 'stalled_deal',
                        'entity_type' => 'crm_opportunity',
                        'entity_id' => $oppId,
                        'title' => 'Negociación estancada',
                        'message' => "La negociación \"{$title}\" no ha registrado actividad durante los últimos {$actualDays} días.",
                        'is_read' => 0
                    ]);
                }
            }
        }
    }
}

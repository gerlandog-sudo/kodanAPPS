<?php

declare(strict_types=1);

namespace kodanAPPS\Controllers;

use kodanAPPS\Repositories\EmailTemplateRepository;
use kodanAPPS\Services\MailService;
use InvalidArgumentException;
use RuntimeException;

final class MailController
{
    private EmailTemplateRepository $templateRepo;
    private MailService $mailService;

    public function __construct(EmailTemplateRepository $templateRepo, MailService $mailService)
    {
        $this->templateRepo = $templateRepo;
        $this->mailService = $mailService;
    }

    /**
     * GET /api/mail/templates
     * Lista las plantillas de correo filtradas opcionalmente por módulo
     * 
     * @return array<int, array<string, mixed>>
     */
    public function listTemplates(): array
    {
        $module = isset($_GET['module']) ? trim((string)$_GET['module']) : null;
        return $this->templateRepo->getTemplatesByModule($module);
    }

    /**
     * GET /api/mail/templates/{id}
     * Obtiene una plantilla de correo por ID
     * 
     * @param array{id: int} $p
     * @return array<string, mixed>
     */
    public function getTemplate(array $p): array
    {
        $template = $this->templateRepo->findById($p['id']);
        if (!$template) {
            throw new RuntimeException('Plantilla no encontrada.', 404);
        }
        return $template;
    }

    /**
     * POST /api/mail/templates
     * Crea una nueva plantilla de correo
     * 
     * @param array<string, mixed> $input
     * @return array{success: bool, id: int, message: string}
     */
    public function createTemplate(array $input): array
    {
        $name = isset($input['name']) ? trim((string)$input['name']) : '';
        $subject = isset($input['subject']) ? trim((string)$input['subject']) : '';
        $body = isset($input['body']) ? trim((string)$input['body']) : '';

        if ($name === '') {
            throw new InvalidArgumentException('El nombre de la plantilla es requerido.');
        }
        if ($subject === '') {
            throw new InvalidArgumentException('El asunto por defecto es requerido.');
        }
        if ($body === '') {
            throw new InvalidArgumentException('El cuerpo de la plantilla es requerido.');
        }

        $newId = $this->templateRepo->createTemplate($input);

        return [
            'success' => true,
            'id' => $newId,
            'message' => 'Plantilla de correo creada exitosamente.'
        ];
    }

    /**
     * PATCH /api/mail/templates/{id}
     * Actualiza una plantilla existente
     * 
     * @param array{id: int} $p
     * @param array<string, mixed> $input
     * @return array{success: bool, message: string}
     */
    public function updateTemplate(array $p, array $input): array
    {
        $template = $this->templateRepo->findById($p['id']);
        if (!$template) {
            throw new RuntimeException('Plantilla no encontrada.', 404);
        }

        $this->templateRepo->updateTemplate($p['id'], $input);

        return [
            'success' => true,
            'message' => 'Plantilla de correo actualizada exitosamente.'
        ];
    }

    /**
     * DELETE /api/mail/templates/{id}
     * Elimina una plantilla
     * 
     * @param array{id: int} $p
     * @return array{success: bool, message: string}
     */
    public function deleteTemplate(array $p): array
    {
        $template = $this->templateRepo->findById($p['id']);
        if (!$template) {
            throw new RuntimeException('Plantilla no encontrada.', 404);
        }

        $this->templateRepo->deleteTemplate($p['id']);

        return [
            'success' => true,
            'message' => 'Plantilla de correo eliminada exitosamente.'
        ];
    }

    /**
     * POST /api/mail/send
     * Dispara el envío de un correo y su registro
     * 
     * @param array<string, mixed> $input
     * @return array{success: bool, message_id: int, message: string}
     */
    public function sendMail(array $input): array
    {
        $result = $this->mailService->sendAndLog($input);

        return [
            'success' => true,
            'message_id' => $result['message_id'],
            'message' => 'Correo electrónico enviado y registrado exitosamente.'
        ];
    }
}

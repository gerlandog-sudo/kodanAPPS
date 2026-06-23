<?php

declare(strict_types=1);

namespace kodanAPPS\Controllers;

use kodanAPPS\DB\TenantContext;
use kodanAPPS\Repositories\AccountRepository;
use kodanAPPS\Repositories\ContactRepository;
use kodanAPPS\Repositories\OpportunityRepository;
use kodanAPPS\Repositories\PipelineRepository;
use RuntimeException;

final class LeadController
{
    private const TENANT_ID = 16;

    public function __construct(
        private string $publicSecret,
        private AccountRepository $accountRepo,
        private ContactRepository $contactRepo,
        private OpportunityRepository $oppRepo,
        private PipelineRepository $pipelineRepo,
    ) {}

    /**
     * @param array<string, mixed> $input
     * @return array<string, mixed>
     */
    public function submit(array $input): array
    {
        $secret = $_SERVER['HTTP_X_PUBLIC_SECRET'] ?? '';
        if ($secret === '' || !hash_equals($this->publicSecret, $secret)) {
            throw new RuntimeException('Unauthorized', 401);
        }

        $companyName = isset($input['company']['name']) && is_scalar($input['company']['name'])
            ? trim((string)$input['company']['name']) : '';
        $firstName = isset($input['contact']['first_name']) && is_scalar($input['contact']['first_name'])
            ? trim((string)$input['contact']['first_name']) : '';
        $lastName = isset($input['contact']['last_name']) && is_scalar($input['contact']['last_name'])
            ? trim((string)$input['contact']['last_name']) : '';
        $email = isset($input['contact']['email']) && is_scalar($input['contact']['email'])
            ? trim((string)$input['contact']['email']) : '';

        if ($companyName === '' || $firstName === '' || $lastName === '' || $email === '') {
            throw new RuntimeException('Bad request: company.name, contact.first_name, contact.last_name and contact.email are required', 400);
        }

        TenantContext::set(self::TENANT_ID, 0, [], 'public');

        $pipelines = $this->pipelineRepo->rawSelect(
            "SELECT * FROM pipelines WHERE tenant_id = ? ORDER BY is_default DESC, id ASC LIMIT 1",
            [self::TENANT_ID]
        );
        if (empty($pipelines)) {
            throw new RuntimeException('No pipeline configured for this tenant', 500);
        }

        $stages = $this->pipelineRepo->rawSelect(
            "/* BYPASS_TENANT_SCOPE */ SELECT * FROM pipeline_stages WHERE pipeline_id = ? ORDER BY sort_order ASC, id ASC LIMIT 1",
            [(int)$pipelines[0]['id']]
        );
        if (empty($stages)) {
            throw new RuntimeException('No stages in default pipeline', 500);
        }

        $companyPhone = isset($input['company']['phone']) && is_scalar($input['company']['phone'])
            ? trim((string)$input['company']['phone']) : null;

        $accountId = $this->accountRepo->createAccount([
            'name' => $companyName,
            'phone' => $companyPhone,
            'legal_name' => null,
            'tax_id' => null,
            'website' => null,
            'address' => null,
        ]);

        $contactPhone = isset($input['contact']['phone']) && is_scalar($input['contact']['phone'])
            ? trim((string)$input['contact']['phone']) : null;
        $contactMobile = isset($input['contact']['mobile']) && is_scalar($input['contact']['mobile'])
            ? trim((string)$input['contact']['mobile']) : null;

        $contactId = $this->contactRepo->createContact([
            'account_id' => $accountId,
            'first_name' => $firstName,
            'last_name' => $lastName,
            'email' => $email,
            'phone' => $contactPhone,
            'mobile' => $contactMobile,
        ]);

        $oppId = $this->oppRepo->createOpportunity([
            'account_id' => $accountId,
            'contact_id' => $contactId,
            'pipeline_stage_id' => (int)$stages[0]['id'],
            'title' => "Contacto Web - {$companyName}",
            'value' => 0.00,
            'currency' => 'USD',
            'close_date' => null,
            'owner_user_id' => null,
            'custom_fields' => [],
        ]);

        return [
            'success' => true,
            'opportunity_id' => $oppId,
            'message' => 'Negociación creada correctamente',
        ];
    }
}

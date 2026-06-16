<?php

declare(strict_types=1);

namespace kodanAPPS\Controllers;

use kodanAPPS\Repositories\ContactRepository;
use InvalidArgumentException;
use RuntimeException;

final class ContactController
{
    private ContactRepository $contactRepo;

    public function __construct(ContactRepository $contactRepo)
    {
        $this->contactRepo = $contactRepo;
    }

    /**
     * GET /api/crm/contacts
     * 
     * @return array<int, array<string, mixed>>
     */
    public function list(): array
    {
        $accountId = isset($_GET['account_id']) ? (int)$_GET['account_id'] : 0;
        if ($accountId > 0) {
            return $this->contactRepo->listByAccount($accountId);
        }
        return $this->contactRepo->listAll();
    }

    /**
     * GET /api/crm/contacts/{id}
     * 
     * @return array<string, mixed>
     */
    public function get(int $id): array
    {
        $contact = $this->contactRepo->findById($id);
        if ($contact === null) {
            throw new RuntimeException('Contacto no encontrado.', 404);
        }

        // Decodificar custom_fields si viene como string
        if (isset($contact['custom_fields']) && is_string($contact['custom_fields'])) {
            $contact['custom_fields'] = json_decode($contact['custom_fields'], true) ?? [];
        }

        return $contact;
    }

    /**
     * POST /api/crm/contacts
     * 
     * @param array<string, mixed> $input
     * @return array{success: bool, id: int, message: string}
     */
    public function create(array $input): array
    {
        $firstName = isset($input['first_name']) && is_scalar($input['first_name']) ? trim((string)$input['first_name']) : '';
        $lastName = isset($input['last_name']) && is_scalar($input['last_name']) ? trim((string)$input['last_name']) : '';
        $email = isset($input['email']) && is_scalar($input['email']) ? strtolower(trim((string)$input['email'])) : '';

        $errors = [];
        if ($firstName === '') {
            $errors['first_name'] = 'El nombre es requerido.';
        }
        if ($lastName === '') {
            $errors['last_name'] = 'El apellido es requerido.';
        }
        if ($email === '') {
            $errors['email'] = 'El email es requerido.';
        } elseif (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            $errors['email'] = 'El formato de email no es válido.';
        }

        if (!empty($errors)) {
            throw new InvalidArgumentException((string)json_encode([
                'message' => 'Campos requeridos faltantes o inválidos',
                'errors' => $errors
            ], JSON_UNESCAPED_UNICODE));
        }

        $customFields = isset($input['custom_fields']) && is_array($input['custom_fields']) ? $input['custom_fields'] : [];

        $data = [
            'account_id' => isset($input['account_id']) && is_scalar($input['account_id']) && (int)$input['account_id'] > 0 ? (int)$input['account_id'] : null,
            'first_name' => $firstName,
            'last_name' => $lastName,
            'email' => $email,
            'phone' => isset($input['phone']) && is_scalar($input['phone']) ? trim((string)$input['phone']) : null,
            'mobile' => isset($input['mobile']) && is_scalar($input['mobile']) ? trim((string)$input['mobile']) : null,
            'custom_fields' => $customFields,
        ];

        $id = $this->contactRepo->createContact($data);

        return [
            'success' => true,
            'id' => $id,
            'message' => 'Contacto creado exitosamente.'
        ];
    }

    /**
     * PATCH/PUT /api/crm/contacts/{id}
     * 
     * @param array<string, mixed> $input
     * @return array{success: bool, affected: int, message: string}
     */
    public function update(int $id, array $input): array
    {
        $contact = $this->contactRepo->findById($id);
        if ($contact === null) {
            throw new RuntimeException('Contacto no encontrado.', 404);
        }

        $data = [];
        
        if (isset($input['first_name'])) {
            $firstName = is_scalar($input['first_name']) ? trim((string)$input['first_name']) : '';
            if ($firstName === '') {
                throw new InvalidArgumentException((string)json_encode([
                    'message' => 'Validación fallida',
                    'errors' => ['first_name' => 'El nombre no puede estar vacío.']
                ], JSON_UNESCAPED_UNICODE));
            }
            $data['first_name'] = $firstName;
        }

        if (isset($input['last_name'])) {
            $lastName = is_scalar($input['last_name']) ? trim((string)$input['last_name']) : '';
            if ($lastName === '') {
                throw new InvalidArgumentException((string)json_encode([
                    'message' => 'Validación fallida',
                    'errors' => ['last_name' => 'El apellido no puede estar vacío.']
                ], JSON_UNESCAPED_UNICODE));
            }
            $data['last_name'] = $lastName;
        }

        if (isset($input['email'])) {
            $email = is_scalar($input['email']) ? strtolower(trim((string)$input['email'])) : '';
            if ($email === '') {
                throw new InvalidArgumentException((string)json_encode([
                    'message' => 'Validación fallida',
                    'errors' => ['email' => 'El email no puede estar vacío.']
                ], JSON_UNESCAPED_UNICODE));
            } elseif (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
                throw new InvalidArgumentException((string)json_encode([
                    'message' => 'Validación fallida',
                    'errors' => ['email' => 'El formato de email no es válido.']
                ], JSON_UNESCAPED_UNICODE));
            }
            $data['email'] = $email;
        }

        if (array_key_exists('account_id', $input)) {
            $data['account_id'] = isset($input['account_id']) && is_scalar($input['account_id']) && (int)$input['account_id'] > 0 ? (int)$input['account_id'] : null;
        }
        if (array_key_exists('phone', $input)) {
            $data['phone'] = isset($input['phone']) && is_scalar($input['phone']) ? trim((string)$input['phone']) : null;
        }
        if (array_key_exists('mobile', $input)) {
            $data['mobile'] = isset($input['mobile']) && is_scalar($input['mobile']) ? trim((string)$input['mobile']) : null;
        }
        if (isset($input['custom_fields']) && is_array($input['custom_fields'])) {
            $data['custom_fields'] = $input['custom_fields'];
        }

        if (empty($data)) {
            return [
                'success' => true,
                'affected' => 0,
                'message' => 'No se enviaron campos para actualizar.'
            ];
        }

        $affected = $this->contactRepo->updateContact($id, $data);

        return [
            'success' => true,
            'affected' => $affected,
            'message' => 'Contacto actualizado exitosamente.'
        ];
    }

    /**
     * DELETE /api/crm/contacts/{id}
     * 
     * @return array{success: bool, message: string}
     */
    public function delete(int $id): array
    {
        $contact = $this->contactRepo->findById($id);
        if ($contact === null) {
            throw new RuntimeException('Contacto no encontrado.', 404);
        }

        $this->contactRepo->deleteContact($id);

        return [
            'success' => true,
            'message' => 'Contacto eliminado exitosamente.'
        ];
    }
}

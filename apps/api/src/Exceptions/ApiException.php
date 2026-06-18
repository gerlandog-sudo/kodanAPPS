<?php

declare(strict_types=1);

namespace kodanAPPS\Exceptions;

use RuntimeException;

/**
 * ApiException — Excepción base estandarizada para toda la API.
 *
 * Reemplaza el uso disperso de RuntimeException e InvalidArgumentException
 * con un formato unificado que el Router puede serializar directamente.
 */
class ApiException extends RuntimeException
{
    /** Códigos de error machine-readable */
    public const VALIDATION_ERROR = 'VALIDATION_ERROR';
    public const NOT_FOUND = 'NOT_FOUND';
    public const UNAUTHORIZED = 'UNAUTHORIZED';
    public const FORBIDDEN = 'FORBIDDEN';
    public const TOKEN_EXPIRED = 'TOKEN_EXPIRED';
    public const TOKEN_INVALID = 'TOKEN_INVALID';
    public const TOKEN_STOLEN = 'TOKEN_STOLEN';
    public const CONFLICT = 'CONFLICT';
    public const RATE_LIMITED = 'RATE_LIMITED';
    public const INTERNAL_ERROR = 'INTERNAL_ERROR';

    /**
     * @param string $message Mensaje legible
     * @param int $statusCode HTTP status (400-599)
     * @param string $errorCode Identificador machine-readable
     * @param array<string, array<string>>|null $errors Errores de validación por campo (solo para 422)
     * @param \Throwable|null $previous Excepción anterior para encadenamiento
     */
    public function __construct(
        string $message,
        int $statusCode = 500,
        private readonly string $errorCode = self::INTERNAL_ERROR,
        private readonly ?array $errors = null,
        ?\Throwable $previous = null,
    ) {
        parent::__construct($message, $statusCode, $previous);
    }

    /**
     * Serializa la excepción a array para respuesta JSON.
     *
     * @return array<string, mixed>
     */
    public function toArray(): array
    {
        $result = [
            'error' => $this->getMessage(),
            'code' => $this->errorCode,
        ];

        // Para errores de validación (422), incluir detalles por campo
        if ($this->errorCode === self::VALIDATION_ERROR && $this->errors !== null) {
            $result = [
                'message' => $this->getMessage(),
                'errors' => $this->errors,
                'code' => $this->errorCode,
            ];
        }

        return $result;
    }

    /**
     * Crea una ApiException para 404 Not Found.
     */
    public static function notFound(string $resource = 'Recurso'): self
    {
        return new self(
            "{$resource} no encontrado.",
            404,
            self::NOT_FOUND,
        );
    }

    /**
     * Crea una ApiException para 401 Unauthorized.
     */
    public static function unauthorized(string $message = 'No autenticado.'): self
    {
        return new self($message, 401, self::UNAUTHORIZED);
    }

    /**
     * Crea una ApiException para 403 Forbidden.
     */
    public static function forbidden(string $message = 'Acceso denegado.'): self
    {
        return new self($message, 403, self::FORBIDDEN);
    }

    /**
     * Crea una ApiException para 422 Validation Error.
     *
     * @param array<string, array<string>> $errors Errores por campo
     */
    public static function validationError(string $message = 'Error de validación.', array $errors = []): self
    {
        return new self($message, 422, self::VALIDATION_ERROR, $errors);
    }
}

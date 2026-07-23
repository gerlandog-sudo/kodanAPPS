import { describe, it, expect } from 'vitest';

// Utilidad compleja de formateo y cálculo de tiempo acumulado
export function formatDurationMinutes(minutes: number): string {
  if (isNaN(minutes) || minutes < 0) return '00:00';
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  const pad = (num: number) => num.toString().padStart(2, '0');
  return `${pad(hours)}:${pad(mins)}`;
}

// Comprobación de solapamiento de rangos horarios (Edge Case de Fichajes)
export function hasTimeOverlap(
  startA: Date, endA: Date,
  startB: Date, endB: Date
): boolean {
  return startA < endB && startB < endA;
}

// Validador de límites de cuota de tenant
export function isQuotaExceeded(currentUsage: number, limit: number): boolean {
  if (limit === -1) return false; // Ilimitado
  return currentUsage >= limit;
}

describe('Lógica Compleja de Frontend & Casos Borde', () => {
  describe('FormatDurationMinutes', () => {
    it('debe formatear minutos en formato HH:MM correctamente', () => {
      expect(formatDurationMinutes(135)).toBe('02:15');
      expect(formatDurationMinutes(0)).toBe('00:00');
      expect(formatDurationMinutes(600)).toBe('10:00');
    });

    it('debe retornar 00:00 ante entradas negativas o no numéricas (Caso Borde)', () => {
      expect(formatDurationMinutes(-45)).toBe('00:00');
      expect(formatDurationMinutes(NaN)).toBe('00:00');
    });
  });

  describe('HasTimeOverlap (Solapamiento de Fichajes)', () => {
    it('debe detectar solapamiento entre dos fichajes concurrentes', () => {
      const start1 = new Date('2026-07-21T09:00:00');
      const end1 = new Date('2026-07-21T12:00:00');

      const start2 = new Date('2026-07-21T11:30:00');
      const end2 = new Date('2026-07-21T14:00:00');

      expect(hasTimeOverlap(start1, end1, start2, end2)).toBe(true);
    });

    it('debe permitir rangos consecutivos sin solapamiento (Caso Borde exacto)', () => {
      const start1 = new Date('2026-07-21T09:00:00');
      const end1 = new Date('2026-07-21T12:00:00');

      const start2 = new Date('2026-07-21T12:00:00');
      const end2 = new Date('2026-07-21T15:00:00');

      expect(hasTimeOverlap(start1, end1, start2, end2)).toBe(false);
    });
  });

  describe('IsQuotaExceeded (Límites de Uso)', () => {
    it('debe retornar true si el uso actual alcanza o supera el límite', () => {
      expect(isQuotaExceeded(10, 10)).toBe(true);
      expect(isQuotaExceeded(11, 10)).toBe(true);
      expect(isQuotaExceeded(9, 10)).toBe(false);
    });

    it('debe soportar planes con cuotas ilimitadas (-1) (Caso Borde)', () => {
      expect(isQuotaExceeded(99999, -1)).toBe(false);
    });
  });
});

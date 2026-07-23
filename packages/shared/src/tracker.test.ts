import { describe, it, expect } from 'vitest';

// Lógica de conversión de entradas de tiempo a porcentaje de la jornada laboral (8 horas = 480 mins)
export function calculateWorkdayProgress(minutesLogged: number, standardWorkdayMinutes: number = 480): number {
  if (minutesLogged <= 0 || standardWorkdayMinutes <= 0) return 0;
  const pct = Math.round((minutesLogged / standardWorkdayMinutes) * 100);
  return Math.min(pct, 100); // Tope al 100% de la jornada visual
}

// Filtro y agrupador de horas por proyecto para reporte mensual
export interface TimeEntryItem {
  id: number;
  projectId: number;
  durationMinutes: number;
  billable: boolean;
}

export function aggregateProjectHours(entries: TimeEntryItem[]) {
  return entries.reduce((acc, entry) => {
    if (!acc[entry.projectId]) {
      acc[entry.projectId] = { totalMinutes: 0, billableMinutes: 0 };
    }
    acc[entry.projectId].totalMinutes += entry.durationMinutes;
    if (entry.billable) {
      acc[entry.projectId].billableMinutes += entry.durationMinutes;
    }
    return acc;
  }, {} as Record<number, { totalMinutes: number; billableMinutes: number }>);
}

describe('Tracker Frontend Logic & Reporting Utils', () => {
  describe('CalculateWorkdayProgress', () => {
    it('debe calcular el porcentaje alcanzado de la jornada laboral', () => {
      expect(calculateWorkdayProgress(240)).toBe(50); // 4hs de 8hs
      expect(calculateWorkdayProgress(480)).toBe(100); // 8hs completas
    });

    it('debe topar al 100% ante horas extra para no romper barra de progreso', () => {
      expect(calculateWorkdayProgress(600)).toBe(100); // 10hs registradas
    });

    it('debe retornar 0 para valores nulos o negativos', () => {
      expect(calculateWorkdayProgress(0)).toBe(0);
      expect(calculateWorkdayProgress(-100)).toBe(0);
    });
  });

  describe('AggregateProjectHours', () => {
    it('debe agrupar horas totales y facturables por proyecto correctamente', () => {
      const entries: TimeEntryItem[] = [
        { id: 1, projectId: 10, durationMinutes: 120, billable: true },
        { id: 2, projectId: 10, durationMinutes: 60, billable: false },
        { id: 3, projectId: 20, durationMinutes: 90, billable: true },
      ];

      const result = aggregateProjectHours(entries);

      expect(result[10]).toEqual({ totalMinutes: 180, billableMinutes: 120 });
      expect(result[20]).toEqual({ totalMinutes: 90, billableMinutes: 90 });
    });
  });
});

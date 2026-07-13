import { useMemo, useCallback } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { withAlpha, tintWithSurface } from '@kodan-apps/ui-core';
import type { NegotiationOpportunity, Stage } from '../../hooks/useNegotiationsData';

interface CalendarViewProps {
  currentDate: Date;
  stages: Stage[];
  opportunities: NegotiationOpportunity[];
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onToday: () => void;
  onDayClick: (date: Date) => void;
  onOppClick: (opp: NegotiationOpportunity) => void;
}

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

const DAY_LABELS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

function getLocalDateString(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function CalendarView({
  currentDate,
  stages,
  opportunities,
  onPrevMonth,
  onNextMonth,
  onToday,
  onDayClick,
  onOppClick,
}: CalendarViewProps) {
  const calendarCells = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const firstDayOfMonth = new Date(year, month, 1);
    const dayOfWeek = firstDayOfMonth.getDay();
    const startPadding = dayOfWeek === 0 ? 6 : dayOfWeek - 1;

    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const prevMonthDays = new Date(year, month, 0).getDate();

    const cells: Array<{ day: number; isCurrentMonth: boolean; date: Date }> = [];

    for (let i = startPadding - 1; i >= 0; i--) {
      cells.push({ day: prevMonthDays - i, isCurrentMonth: false, date: new Date(year, month - 1, prevMonthDays - i) });
    }

    for (let i = 1; i <= daysInMonth; i++) {
      cells.push({ day: i, isCurrentMonth: true, date: new Date(year, month, i) });
    }

    const nextPaddingCount = cells.length % 7 === 0 ? 0 : 7 - (cells.length % 7);
    for (let i = 1; i <= nextPaddingCount; i++) {
      cells.push({ day: i, isCurrentMonth: false, date: new Date(year, month + 1, i) });
    }

    return cells;
  }, [currentDate]);

  const todayStr = useMemo(() => getLocalDateString(new Date()), []);

  const handleDayClick = useCallback(
    (date: Date) => {
      onDayClick(date);
    },
    [onDayClick],
  );

  return (
    <div className="flex flex-col flex-1 min-h-0 bg-surface-raised border border-border-soft rounded-lg overflow-hidden p-4">
      {/* Header del Calendario */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-bold text-text">
          {MONTH_NAMES[currentDate.getMonth()]} {currentDate.getFullYear()}
        </h2>
        <div className="flex items-center gap-1.5">
          <button
            onClick={onPrevMonth}
            className="bg-transparent border border-border-soft hover:bg-surface hover:text-text rounded-md p-1.5 cursor-pointer text-text-muted transition-colors active:scale-95 flex items-center justify-center"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            onClick={onToday}
            className="bg-transparent border border-border-soft hover:bg-surface hover:text-text rounded-md px-3 py-1.5 cursor-pointer text-xs font-semibold text-text-muted transition-colors active:scale-95"
          >
            Hoy
          </button>
          <button
            onClick={onNextMonth}
            className="bg-transparent border border-border-soft hover:bg-surface hover:text-text rounded-md p-1.5 cursor-pointer text-text-muted transition-colors active:scale-95 flex items-center justify-center"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* Rejilla del Calendario */}
      <div className="flex flex-col flex-1 min-h-0">
        <div className="grid grid-cols-7 border-b border-border-soft pb-2 mb-1">
          {DAY_LABELS.map((lbl) => (
            <div key={lbl} className="text-center text-[11px] font-bold uppercase tracking-wider text-text-muted">
              {lbl}
            </div>
          ))}
        </div>

        <div
          className="grid grid-cols-7 flex-1 min-h-0 divide-x divide-y divide-border-soft/60 border-t border-l border-border-soft/60"
          style={{ gridAutoRows: '1fr' }}
        >
          {calendarCells.map((cell) => {
            const cellDateStr = getLocalDateString(cell.date);
            const isToday = cellDateStr === todayStr;
            const dayOpps = opportunities.filter((opp) => opp.close_date === cellDateStr);

            return (
              <div
                key={cellDateStr}
                onClick={() => handleDayClick(cell.date)}
                className={`p-2 flex flex-col gap-1 min-h-[90px] overflow-hidden select-none transition-colors border-r border-b border-border-soft/60 cursor-pointer ${
                  cell.isCurrentMonth ? 'bg-surface-raised hover:bg-surface-hover/20' : 'bg-surface/30 opacity-40'
                }`}
              >
                <div className="flex justify-between items-center">
                  <span />
                  <span
                    className={`text-[11px] font-bold w-5 h-5 flex items-center justify-center rounded-full ${
                      isToday ? 'bg-primary text-on-primary' : 'text-text-muted'
                    }`}
                  >
                    {cell.day}
                  </span>
                </div>
                <div className="flex-1 overflow-y-auto pr-0.5 flex flex-col gap-1 max-h-[120px] scrollbar-none">
                  {dayOpps.map((opp) => {
                    const stage = stages.find((s) => s.id === opp.pipeline_stage_id);
                    const stageColor = stage?.color_hex || 'var(--sys-primary)';
                    return (
                      <div
                        key={opp.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          onOppClick(opp);
                        }}
                        className="w-full text-left p-1 rounded text-[10px] font-medium transition-all hover:scale-[1.01] truncate flex flex-col border"
                        style={{
                          background: tintWithSurface(stageColor, 8),
                          borderColor: withAlpha(stageColor, 20),
                          borderLeftWidth: '3px',
                          borderLeftColor: stageColor,
                          color: 'var(--sys-text)',
                          cursor: 'pointer',
                        }}
                        title={`${opp.name} - ${stage?.name || ''}`}
                      >
                        <span className="font-semibold truncate leading-tight">{opp.name}</span>
                        <span className="text-[9px] text-primary font-bold mt-0.5">
                          {new Intl.NumberFormat('es-AR', {
                            style: 'currency',
                            currency: 'ARS',
                            maximumFractionDigits: 0,
                          }).format(parseFloat(String(opp.value)) || 0)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

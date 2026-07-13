import { Search, RefreshCw } from 'lucide-react';
import { Select, MultiSelect, DatePicker } from '@kodan-apps/ui-core';
import type { FiltersState } from '../../hooks/useTasksData';

interface SelectOption {
  value: string;
  label: string;
}

interface TaskFiltersPanelProps {
  filters: FiltersState;
  taskTypeOptions: SelectOption[];
  userOptions: SelectOption[];
  opportunityOptions: SelectOption[];
  loading: boolean;
  onFiltersChange: (filters: FiltersState) => void;
  onClearFilters: () => void;
  onRefresh: () => void;
}

export function TaskFiltersPanel({
  filters,
  taskTypeOptions,
  userOptions,
  opportunityOptions,
  loading,
  onFiltersChange,
  onClearFilters,
  onRefresh,
}: TaskFiltersPanelProps) {
  const update = (partial: Partial<FiltersState>) => onFiltersChange({ ...filters, ...partial });

  return (
    <div className="flex flex-wrap items-center gap-3 p-3 rounded-lg border border-border-soft bg-surface/30">
      <div className="flex-1 min-w-[200px] relative">
        <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted opacity-70" />
        <input
          type="text"
          placeholder="Buscar por título o descripción..."
          value={filters.search}
          onChange={(e) => update({ search: e.target.value })}
          className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-border-soft bg-surface-raised text-text text-xs outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
        />
      </div>

      <div className="w-[180px]">
        <MultiSelect
          placeholder="Filtrar por Tipo"
          options={taskTypeOptions}
          values={filters.taskTypes}
          onChange={(vals) => update({ taskTypes: vals })}
        />
      </div>

      <div className="w-[180px]">
        <MultiSelect
          placeholder="Filtrar Operadores"
          options={userOptions}
          values={filters.assignees}
          onChange={(vals) => update({ assignees: vals })}
        />
      </div>

      <div className="w-[200px]">
        <Select
          placeholder="Por Negociación"
          options={opportunityOptions}
          value={filters.opportunityId}
          onChange={(val) => update({ opportunityId: String(val) })}
          searchable
        />
      </div>

      <div className="flex items-center gap-1.5 text-xs text-text-muted">
        <DatePicker
          value={filters.dateStart}
          onChange={(val) => update({ dateStart: val })}
          placeholder="Desde"
          className="w-[140px]"
        />
        <span>a</span>
        <DatePicker
          value={filters.dateEnd}
          onChange={(val) => update({ dateEnd: val })}
          placeholder="Hasta"
          className="w-[140px]"
        />
      </div>

      <div className="flex gap-1.5">
        <button
          onClick={onClearFilters}
          className="bg-transparent border border-border-soft hover:bg-surface rounded px-2.5 py-1.5 text-xs text-text-muted cursor-pointer transition-colors"
          title="Limpiar filtros"
        >
          Limpiar
        </button>
        <button
          onClick={onRefresh}
          className="bg-transparent border border-border-soft hover:bg-surface rounded p-1.5 text-text-muted cursor-pointer transition-colors"
          title="Actualizar datos"
        >
          <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>
    </div>
  );
}

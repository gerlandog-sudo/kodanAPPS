import { Search } from 'lucide-react';

interface B2BSearchFilterProps {
  value: string
  onChange: (val: string) => void
  placeholder?: string
}

export function B2BSearchFilter({ value, onChange, placeholder = 'Buscar...' }: B2BSearchFilterProps) {
  return (
    <div className="relative">
      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--sys-text-muted)' }} />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full pl-9 pr-3 py-2 rounded-lg text-xs font-medium border-none outline-none"
        style={{
          background: 'var(--sys-surface)',
          color: 'var(--sys-text)',
          border: '1px solid var(--sys-border-soft)',
        }}
      />
    </div>
  );
}

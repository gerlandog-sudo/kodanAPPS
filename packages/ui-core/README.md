# @kodan-apps/ui-core

Componentes y hooks compartidos para las aplicaciones Kodan.

## Expand-Only Contract

Toda extensión de componentes existentes debe cumplir:

1. **Props nuevas = `optional`** con default seguro (`false`, `undefined`, `[]`, `() => {}`)
2. **Sin props nuevas → comportamiento IDÉNTICO** al anterior
3. **No se modifican firmas** de props existentes (tipo, nombre, comportamiento)
4. **No se eliminan exports** existentes
5. **Smoke tests** obligatorios en 3 apps antes de merge

### Ejemplo: Table.tsx

```tsx
// ANTES
interface TableProps<T> {
  data: T[]
  columns: TableColumn<T>[]
  // ...
}

// DESPUÉS (solo se agregaron props opcionales al final)
interface TableProps<T> {
  data: T[]
  columns: TableColumn<T>[]
  // ... props existentes intactas ...
  selectable?: boolean         // default: false
  selectedKeys?: (string | number)[]  // default: []
  onSelectionChange?: (keys: (string | number)[]) => void
  bulkActions?: BulkAction<T>[]
  filterable?: boolean         // default: false
  filters?: Record<string, string>   // default: {}
  onFilterChange?: (filters: Record<string, string>) => void
}
```

### Componentes Add-Only

Los componentes nuevos (EntityCard, ConfirmDialog, Breadcrumb, AdminLayout) son **add-only**:
- Se exportan desde `index.ts`
- NO reemplazan componentes existentes
- Los consumidores migran cuando quieran

import { Select } from './Select'

interface Option {
  value: string
  label: string
}

interface MultiSelectProps {
  options: Option[]
  values: string[]
  onChange: (values: string[]) => void
  placeholder?: string
}

export function MultiSelect({
  options,
  values,
  onChange,
  placeholder = 'Seleccionar...',
}: MultiSelectProps) {
  return (
    <Select
      options={options}
      value={values}
      onChange={onChange}
      placeholder={placeholder}
      multiple={true}
      searchable={true}
    />
  )
}

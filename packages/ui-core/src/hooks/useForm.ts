import { useState } from 'react'

export function useForm<T extends Record<string, unknown>>({
  initialValues,
  onSubmit,
}: {
  initialValues: T
  onSubmit: (values: T) => Promise<void>
}) {
  const [values, setValues] = useState<T>(initialValues)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [dirty, setDirty] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const setField = (key: keyof T, value: T[keyof T]) => {
    setValues(prev => ({ ...prev, [key]: value }))
    setDirty(true)
  }

  const reset = () => {
    setValues(initialValues)
    setErrors({})
    setDirty(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      await onSubmit(values)
      setDirty(false)
    } catch (err: unknown) {
      setErrors({ _form: err instanceof Error ? err.message : 'Error al guardar' })
    } finally {
      setSubmitting(false)
    }
  }

  return { values, errors, dirty, submitting, setField, reset, handleSubmit }
}

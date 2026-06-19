import { useState, useCallback } from 'react'

export interface AdminCrudApi<T> {
  list: () => Promise<T[]>
  create: (data: any) => Promise<T>
  update: (id: number, data: any) => Promise<T>
  delete: (id: number) => Promise<void>
}

export function useAdminCrud<T extends { id: number }>({
  api,
}: {
  api: AdminCrudApi<T>
}) {
  const [data, setData] = useState<T[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedIds, setSelectedIds] = useState<number[]>([])

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const result = await api.list()
      setData(result)
      setError(null)
    } catch (e: any) {
      setError(e?.message || 'Error al cargar datos')
    } finally {
      setLoading(false)
    }
  }, [api])

  const createItem = async (input: any) => {
    const item = await api.create(input)
    setData(prev => [...prev, item])
    return item
  }

  const updateItem = async (id: number, input: any) => {
    const item = await api.update(id, input)
    setData(prev => prev.map(d => d.id === id ? item : d))
    return item
  }

  const deleteItem = async (id: number) => {
    await api.delete(id)
    setData(prev => prev.filter(d => d.id !== id))
    setSelectedIds(prev => prev.filter(k => k !== id))
  }

  const bulkDelete = async (ids: number[]) => {
    await Promise.all(ids.map(id => api.delete(id)))
    setData(prev => prev.filter(d => !ids.includes(d.id)))
    setSelectedIds(prev => prev.filter(k => !ids.includes(k)))
  }

  const bulkUpdate = async (ids: number[], changes: Partial<T>) => {
    await Promise.all(ids.map(id => api.update(id, changes)))
    setData(prev => prev.map(d =>
      ids.includes(d.id) ? { ...d, ...changes } : d
    ))
  }

  return { data, loading, error, selectedIds, setSelectedIds, refresh, createItem, updateItem, deleteItem, bulkDelete, bulkUpdate }
}

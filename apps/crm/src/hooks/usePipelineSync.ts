import { useState, useEffect, useCallback } from 'react'
import { crmApi } from '../api/client'
import type { Pipeline } from '../types/admin'

export function usePipelineSync() {
  const [pipelines, setPipelines] = useState<Pipeline[]>([])
  const [selectedPipelineId, setSelectedPipelineId] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)

  const loadPipelines = useCallback(async () => {
    try {
      const data = await crmApi.listPipelines()
      setPipelines(data)

      // Read pipeline from URL if present
      const params = new URLSearchParams(window.location.search)
      const pipeParam = params.get('pipeline')
      const pipeId = pipeParam ? parseInt(pipeParam, 10) : NaN

      if (!isNaN(pipeId) && data.some((p) => p.id === pipeId)) {
        setSelectedPipelineId(pipeId)
      } else if (!selectedPipelineId && data.length > 0) {
        setSelectedPipelineId(data[0].id)
      }
    } catch {
      // silence — caller surfaces error
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadPipelines() }, [])

  const selectPipeline = (id: number) => {
    setSelectedPipelineId(id)
    // Sync to URL without navigation
    const url = new URL(window.location.href)
    url.searchParams.set('pipeline', String(id))
    window.history.replaceState(null, '', url.toString())
  }

  return { pipelines, selectedPipelineId, loading, selectPipeline, loadPipelines }
}

import { useEffect, useState, useCallback } from 'react'
import { crmApi } from '../api/client'
import { toast } from 'sonner'
import type {
  Opportunity,
  B2BAccount,
  DashboardVelocity,
  WinRateByUser,
  RecentActivity,
  PipelineComparison,
  CloseReasonGroup,
  CloseReasonSummary,
} from '@kodan-apps/shared'

export interface DashboardStats {
  totalValue: number
  activeDeals: number
  wonDeals: number
  wonValue: number
  totalAccounts: number
  avgDealSize: number
}

export interface DashboardData {
  opportunities: Opportunity[]
  accounts: B2BAccount[]
  stats: DashboardStats
  stageData: { name: string; value: number; count: number }[]
  hotDeals: Opportunity[]
  salesVelocity: DashboardVelocity
  winRateByUser: WinRateByUser[]
  recentActivity: RecentActivity[]
  pipelineComparison: PipelineComparison[]
  closeReasons: {
    wonReasons: CloseReasonGroup[]
    lostReasons: CloseReasonGroup[]
    summaryTable: CloseReasonSummary[]
  }
}

const emptyData: DashboardData = {
  opportunities: [],
  accounts: [],
  stats: { totalValue: 0, activeDeals: 0, wonDeals: 0, wonValue: 0, totalAccounts: 0, avgDealSize: 0 },
  stageData: [],
  hotDeals: [],
  salesVelocity: { avgDaysToClose: 0, avgStages: 0, conversionRate: 0, trend: 0 },
  winRateByUser: [],
  recentActivity: [],
  pipelineComparison: [],
  closeReasons: { wonReasons: [], lostReasons: [], summaryTable: [] },
}

function getReasonsData(opps: Opportunity[]): CloseReasonGroup[] {
  const counts: Record<string, { count: number; value: number }> = {}
  opps.forEach((o) => {
    const reason = o.close_reason || 'Otro / No especificado'
    if (!counts[reason]) counts[reason] = { count: 0, value: 0 }
    counts[reason].count += 1
    counts[reason].value += parseFloat(o.value as string) || 0
  })
  const sorted = Object.entries(counts)
    .map(([name, data]) => ({ name, ...data }))
    .sort((a, b) => b.count - a.count)
  if (sorted.length <= 4) return sorted
  const top4 = sorted.slice(0, 4)
  const others = sorted.slice(4)
  return [
    ...top4,
    { name: 'Otros', count: others.reduce((a, c) => a + c.count, 0), value: others.reduce((a, c) => a + c.value, 0) },
  ]
}

export function useDashboardData(pipelineId: string | number) {
  const [data, setData] = useState<DashboardData>(emptyData)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params: Record<string, string> = {}
      if (pipelineId !== 'all') params.pipeline_id = String(pipelineId)

      const [opps, accs] = await Promise.all([
        crmApi.listOpportunities(params),
        crmApi.listAccounts(),
      ])

      const active = opps.filter((o) => o.status === 'open')
      const won = opps.filter((o) => o.status === 'won')
      const totalValue = active.reduce((acc, curr) => acc + (parseFloat(curr.value as string) || 0), 0)
      const wonValue = won.reduce((acc, curr) => acc + (parseFloat(curr.value as string) || 0), 0)
      const avgDealSize = opps.length ? totalValue / opps.length : 0

      const stats: DashboardStats = {
        totalValue,
        activeDeals: active.length,
        wonDeals: won.length,
        wonValue,
        totalAccounts: accs.length,
        avgDealSize,
      }

      const stagesMap: Record<string, { name: string; value: number; count: number }> = {}
      opps.forEach((o) => {
        const stageName = o.stage_name || 'Sin Etapa'
        if (!stagesMap[stageName]) stagesMap[stageName] = { name: stageName, value: 0, count: 0 }
        stagesMap[stageName].value += parseFloat(o.value as string) || 0
        stagesMap[stageName].count += 1
      })

      const stageData = Object.values(stagesMap)

      const hotDeals = [...active]
        .sort((a, b) => (parseFloat(b.value as string) || 0) - (parseFloat(a.value as string) || 0))
        .slice(0, 5)

      const wonReasons = getReasonsData(won)
      const lostReasons = getReasonsData(opps.filter((o) => o.status === 'lost'))

      const allReasonsMap: Record<string, CloseReasonSummary> = {}
      opps.forEach((o) => {
        if (o.status !== 'won' && o.status !== 'lost') return
        const reason = o.close_reason || 'Otro / No especificado'
        if (!allReasonsMap[reason]) {
          allReasonsMap[reason] = { name: reason, wonCount: 0, wonValue: 0, lostCount: 0, lostValue: 0 }
        }
        if (o.status === 'won') {
          allReasonsMap[reason].wonCount += 1
          allReasonsMap[reason].wonValue += parseFloat(o.value as string) || 0
        } else {
          allReasonsMap[reason].lostCount += 1
          allReasonsMap[reason].lostValue += parseFloat(o.value as string) || 0
        }
      })
      const summaryTable = Object.entries(allReasonsMap)
        .map(([_name, data]) => ({ ...data, name: _name }))
        .sort((a, b) => b.wonCount + b.lostCount - (a.wonCount + a.lostCount))

      const closeReasons = { wonReasons, lostReasons, summaryTable }

      const salesVelocity: DashboardVelocity = { avgDaysToClose: 0, avgStages: 0, conversionRate: 0, trend: 0 }
      const winRateByUser: WinRateByUser[] = []
      const recentActivity: RecentActivity[] = []
      const pipelineComparison: PipelineComparison[] = []

      try {
        const [velocity, winRate, activity, comparison] = await Promise.allSettled([
          crmApi.getSalesVelocity(pipelineId === 'all' ? undefined : Number(pipelineId)),
          crmApi.getWinRateByUser(pipelineId === 'all' ? undefined : Number(pipelineId)),
          crmApi.getRecentActivity(pipelineId === 'all' ? undefined : Number(pipelineId)),
          crmApi.getPipelineComparison(),
        ])
        if (velocity.status === 'fulfilled') Object.assign(salesVelocity, velocity.value)
        if (winRate.status === 'fulfilled') winRateByUser.push(...winRate.value)
        if (activity.status === 'fulfilled') recentActivity.push(...activity.value)
        if (comparison.status === 'fulfilled') pipelineComparison.push(...comparison.value)
      } catch {
        console.error('[DashboardData] Error al cargar métricas complementarias.')
        toast.error('Error al cargar algunas métricas del Dashboard.')
      }

      setData({
        opportunities: opps,
        accounts: accs,
        stats,
        stageData,
        hotDeals,
        salesVelocity,
        winRateByUser,
        recentActivity,
        pipelineComparison,
        closeReasons,
      })
    } catch (err: unknown) {
      toast.error('Error al cargar métricas del Dashboard')
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setTimeout(() => setLoading(false), 350)
    }
  }, [pipelineId])

  useEffect(() => {
    loadData()
  }, [loadData])

  const setPipelineId = useCallback((id: string | number) => {
    window.history.replaceState(null, '', `?pipeline_id=${id}`)
  }, [])

  return { ...data, loading, error, reload: loadData, setPipelineId }
}

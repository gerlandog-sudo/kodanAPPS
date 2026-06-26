import { useEffect, useState, useCallback } from 'react'
import { crmApi } from '../api/client'
import { toast } from 'sonner'

export interface DashboardStats {
  totalValue: number
  activeDeals: number
  wonDeals: number
  wonValue: number
  totalAccounts: number
  avgDealSize: number
}

export interface DashboardData {
  opportunities: any[]
  accounts: any[]
  stats: DashboardStats
  stageData: { name: string; value: number; count: number }[]
  hotDeals: any[]
  salesVelocity: { avgDaysToClose: number; avgStages: number; conversionRate: number; trend: number }
  winRateByUser: { id: number; name: string; avatar: string | null; won: number; lost: number; winRate: number; totalValue: number }[]
  recentActivity: { type: string; message: string; userName: string; timestamp: string; entityType: string; entityId: number }[]
  pipelineComparison: { id: number; name: string; totalValue: number; activeDeals: number; wonDeals: number; winRate: number; avgCycleDays: number; color: string }[]
  closeReasons: {
    wonReasons: { name: string; count: number; value: number }[]
    lostReasons: { name: string; count: number; value: number }[]
    summaryTable: { name: string; wonCount: number; wonValue: number; lostCount: number; lostValue: number }[]
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
  closeReasons: { wonReasons: [], lostReasons: [], summaryTable: [] }
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
        crmApi.listAccounts()
      ])

      const active = opps.filter((o: any) => o.status === 'open')
      const won = opps.filter((o: any) => o.status === 'won')
      const totalValue = active.reduce((acc: number, curr: any) => acc + (parseFloat(curr.value) || 0), 0)
      const wonValue = won.reduce((acc: number, curr: any) => acc + (parseFloat(curr.value) || 0), 0)
      const avgDealSize = opps.length ? totalValue / opps.length : 0

      const stats: DashboardStats = {
        totalValue,
        activeDeals: active.length,
        wonDeals: won.length,
        wonValue,
        totalAccounts: accs.length,
        avgDealSize
      }

      const stagesMap: Record<string, { name: string; value: number; count: number }> = {}
      opps.forEach((o: any) => {
        const stageName = o.stage_name || 'Sin Etapa'
        if (!stagesMap[stageName]) stagesMap[stageName] = { name: stageName, value: 0, count: 0 }
        stagesMap[stageName].value += parseFloat(o.value) || 0
        stagesMap[stageName].count += 1
      })

      const stageData = Object.values(stagesMap)

      const hotDeals = [...active]
        .sort((a: any, b: any) => (parseFloat(b.value) || 0) - (parseFloat(a.value) || 0))
        .slice(0, 5)

      const getReasonsData = (opps: any[]) => {
        const counts: Record<string, { count: number; value: number }> = {}
        opps.forEach((o: any) => {
          const reason = o.close_reason || 'Otro / No especificado'
          if (!counts[reason]) counts[reason] = { count: 0, value: 0 }
          counts[reason].count += 1
          counts[reason].value += parseFloat(o.value) || 0
        })
        const sorted = Object.entries(counts).map(([name, data]) => ({ name, ...data })).sort((a, b) => b.count - a.count)
        if (sorted.length <= 4) return sorted
        const top4 = sorted.slice(0, 4)
        const others = sorted.slice(4)
        return [...top4, { name: 'Otros', count: others.reduce((a, c) => a + c.count, 0), value: others.reduce((a, c) => a + c.value, 0) }]
      }

      const wonReasons = getReasonsData(won)
      const lostReasons = getReasonsData(opps.filter((o: any) => o.status === 'lost'))

      const allReasonsMap: Record<string, { wonCount: number; wonValue: number; lostCount: number; lostValue: number }> = {}
      opps.forEach((o: any) => {
        if (o.status !== 'won' && o.status !== 'lost') return
        const reason = o.close_reason || 'Otro / No especificado'
        if (!allReasonsMap[reason]) allReasonsMap[reason] = { wonCount: 0, wonValue: 0, lostCount: 0, lostValue: 0 }
        if (o.status === 'won') { allReasonsMap[reason].wonCount += 1; allReasonsMap[reason].wonValue += parseFloat(o.value) || 0 }
        else { allReasonsMap[reason].lostCount += 1; allReasonsMap[reason].lostValue += parseFloat(o.value) || 0 }
      })
      const summaryTable = Object.entries(allReasonsMap).map(([name, data]) => ({ name, ...data })).sort((a, b) => (b.wonCount + b.lostCount) - (a.wonCount + a.lostCount))

      const closeReasons = { wonReasons, lostReasons, summaryTable }

      const salesVelocity = { avgDaysToClose: 0, avgStages: 0, conversionRate: 0, trend: 0 }
      const winRateByUser: any[] = []
      const recentActivity: any[] = []
      const pipelineComparison: any[] = []

      try {
        const [velocity, winRate, activity, comparison] = await Promise.allSettled([
          crmApi.getSalesVelocity(pipelineId === 'all' ? undefined : Number(pipelineId)),
          crmApi.getWinRateByUser(pipelineId === 'all' ? undefined : Number(pipelineId)),
          crmApi.getRecentActivity(pipelineId === 'all' ? undefined : Number(pipelineId)),
          crmApi.getPipelineComparison()
        ])
        if (velocity.status === 'fulfilled') Object.assign(salesVelocity, velocity.value)
        if (winRate.status === 'fulfilled') winRateByUser.push(...winRate.value)
        if (activity.status === 'fulfilled') recentActivity.push(...activity.value)
        if (comparison.status === 'fulfilled') pipelineComparison.push(...comparison.value)
      } catch { }

      setData({ opportunities: opps, accounts: accs, stats, stageData, hotDeals, salesVelocity, winRateByUser, recentActivity, pipelineComparison, closeReasons })
    } catch (err: any) {
      toast.error('Error al cargar métricas del Dashboard')
      setError(err.message || 'Error desconocido')
    } finally {
      setTimeout(() => setLoading(false), 350)
    }
  }, [pipelineId])

  useEffect(() => { loadData() }, [loadData])

  const setPipelineId = useCallback((id: string | number) => {
    window.history.replaceState(null, '', `?pipeline_id=${id}`)
  }, [])

  return { ...data, loading, error, reload: loadData, setPipelineId }
}

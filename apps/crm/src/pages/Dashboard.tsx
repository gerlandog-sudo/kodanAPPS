import { useState, useMemo, useEffect } from 'react'
import { SlidePanel, Table, formatCurrency } from '@kodan-apps/ui-core'
import { Users, Briefcase, FileDown, Download, ChevronDown, ChevronUp, BarChart3 } from 'lucide-react'
import { toast } from 'sonner'
import { crmApi } from '../api/client'
import { exportToExcel } from '@kodan-apps/ui-core'
import { useGsapStagger } from '../hooks/useGsapStagger'
import { useDashboardData } from '../hooks/useDashboardData'
import { PipelineSwitcher } from '../components/dashboard/PipelineSwitcher'
import { KpiCardGrid } from '../components/dashboard/KpiCardGrid'
import { SalesVelocityWidget } from '../components/dashboard/SalesVelocityWidget'
import { ActivityTimeline } from '../components/dashboard/ActivityTimeline'
import { PipelineStageChart } from '../components/dashboard/PipelineStageChart'
import { WinRateBySellerWidget } from '../components/dashboard/WinRateBySellerWidget'
import { CloseReasonsAnalysis } from '../components/dashboard/CloseReasonsAnalysis'
import { PipelineComparisonWidget } from '../components/dashboard/PipelineComparisonWidget'
import { AutomationDashboard } from '../components/dashboard/AutomationDashboard'

function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-6 animate-pulse">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-28 rounded-2xl p-5 flex flex-col justify-between" style={{ backgroundColor: 'var(--sys-surface-hover)', opacity: 0.6 }}>
            <div className="flex justify-between">
              <div className="flex flex-col gap-2 w-2/3">
                <div className="h-2.5 rounded w-1/2" style={{ backgroundColor: 'var(--sys-border-soft)' }} />
                <div className="h-6 rounded w-3/4" style={{ backgroundColor: 'var(--sys-border-soft)' }} />
              </div>
              <div className="w-10 h-10 rounded-xl" style={{ backgroundColor: 'var(--sys-border-soft)' }} />
            </div>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 h-64 rounded-2xl p-6" style={{ backgroundColor: 'var(--sys-surface-hover)', opacity: 0.6 }} />
        <div className="h-64 rounded-2xl p-6" style={{ backgroundColor: 'var(--sys-surface-hover)', opacity: 0.6 }} />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-64 rounded-2xl p-6" style={{ backgroundColor: 'var(--sys-surface-hover)', opacity: 0.6 }} />
        ))}
      </div>
    </div>
  )
}

export function Dashboard() {
  const [pipelines, setPipelines] = useState<any[]>([])
  const [selectedPipelineId, setSelectedPipelineId] = useState<string | number>('all')
  const [initialLoading, setInitialLoading] = useState(true)
  const [showExtended, setShowExtended] = useState(false)

  const dashboard = useDashboardData(selectedPipelineId)
  const staggerRef = useGsapStagger({ key: selectedPipelineId, enabled: !dashboard.loading })

  const [drillDownOpen, setDrillDownOpen] = useState(false)
  const [drillDownType, setDrillDownType] = useState<'pipeline' | 'active' | 'won' | 'accounts' | null>(null)

  useEffect(() => {
    crmApi.listPipelines().then(pps => {
      setPipelines(pps)
    }).catch((err) => {
      console.error('[Dashboard] Error al cargar pipelines:', err);
    }).finally(() => setTimeout(() => setInitialLoading(false), 200))
  }, [])

  const handlePipelineChange = (id: string | number) => {
    setSelectedPipelineId(id)
  }

  const handleOpenDrillDown = (type: 'pipeline' | 'active' | 'won' | 'accounts') => {
    setDrillDownType(type)
    setDrillDownOpen(true)
  }

  const drillDownContent = useMemo(() => {
    if (!drillDownType) return null
    if (drillDownType === 'accounts') {
      return (
        <Table
          data={dashboard.accounts}
          columns={[
            { key: 'name', header: 'Nombre Cuenta', render: (item: any) => <span className="font-semibold">{item.name}</span>, sortable: true },
            { key: 'industry', header: 'Industria', render: (item: any) => item.industry || 'No especificada', sortable: true },
            { key: 'created_at', header: 'Fecha Registro', render: (item: any) => item.created_at ? new Date(item.created_at).toLocaleDateString('es-AR') : '-' }
          ]}
          keyExtractor={(item) => item.account_id}
          pageSize={10}
          emptyState={{ icon: <Users size={32} className="text-muted" />, title: 'Sin cuentas', description: 'No se encontraron clientes corporativos registrados.' }}
        />
      )
    }
    const oppsFiltradas = dashboard.opportunities.filter((o: any) => {
      if (drillDownType === 'pipeline' || drillDownType === 'active') return o.status === 'open'
      if (drillDownType === 'won') return o.status === 'won'
      return true
    })
    return (
      <Table
        data={oppsFiltradas}
        columns={[
          { key: 'title', header: 'Negociación', render: (item: any) => <span className="font-semibold">{item.title}</span>, sortable: true },
          { key: 'stage_name', header: 'Etapa', render: (item: any) => <span className="px-2 py-0.5 rounded text-[10px] font-medium" style={{ background: 'var(--sys-surface-hover)', border: '1px solid var(--sys-border-soft)' }}>{item.stage_name || 'Inicial'}</span>, sortable: true },
          { key: 'value', header: 'Valor', render: (item: any) => <span className="font-bold text-primary">{formatCurrency(parseFloat(item.value) || 0, 0)}</span>, align: 'right' as const, sortable: true },
          { key: 'created_at', header: 'Creado el', render: (item: any) => item.created_at ? new Date(item.created_at).toLocaleDateString('es-AR') : '-' }
        ]}
        keyExtractor={(item) => item.id}
        pageSize={10}
        emptyState={{ icon: <Briefcase size={32} className="text-muted" />, title: 'Sin oportunidades', description: 'No hay negociaciones en esta categoría.' }}
      />
    )
  }, [drillDownType, dashboard.opportunities, dashboard.accounts])

  const drillDownTitle = useMemo(() => {
    const titles: Record<string, string> = { pipeline: 'Desglose: Valor del Canal', active: 'Desglose: Negociaciones Activas', won: 'Desglose: Negociaciones Ganadas', accounts: 'Desglose: Cuentas Activas' }
    return titles[drillDownType || ''] || 'Detalle Analítico'
  }, [drillDownType])

  const handleExportExcel = async () => {
    try {
      const dataToExport = dashboard.opportunities.map((o: any) => ({
        title: o.title || o.name,
        stage: o.stage_name || 'Sin etapa',
        value: parseFloat(o.value) || 0,
        status: o.status === 'open' ? 'Activo' : o.status === 'won' ? 'Ganado' : 'Perdido',
        close_date: o.close_date || 'Sin fecha',
        created_at: o.created_at ? new Date(o.created_at).toLocaleDateString('es-AR') : 'Sin fecha'
      }))
      await exportToExcel({
        data: dataToExport,
        columns: [
          { key: 'title', header: 'Negociación / Oportunidad' },
          { key: 'stage', header: 'Etapa' },
          { key: 'value', header: 'Valor (ARS)', align: 'right', numFmt: '$#,##0' },
          { key: 'status', header: 'Estado', align: 'center' },
          { key: 'close_date', header: 'Fecha de Cierre', align: 'center' },
          { key: 'created_at', header: 'Fecha de Registro', align: 'center' }
        ],
        filename: `reporte_comercial_${new Date().toISOString().split('T')[0]}`,
        sheetName: 'Negociaciones'
      })
      toast.success('Métricas exportadas a Excel con éxito')
    } catch { toast.error('Error al exportar a Excel') }
  }

  const loading = initialLoading || dashboard.loading

  return (
    <div className="flex flex-col gap-5 flex-1 overflow-y-auto pr-2 scrollbar-none">
      <div className="flex items-start justify-between gap-4 shrink-0 pb-3 border-b" style={{ borderColor: 'var(--sys-border-soft)' }}>
        <PipelineSwitcher
          pipelines={pipelines}
          selectedId={selectedPipelineId}
          onChange={handlePipelineChange}
          loading={loading}
        />
        <div className="flex items-center gap-1.5 no-print shrink-0 pt-1">
          <button
            onClick={() => window.print()}
            className="bg-transparent border border-border-soft hover:bg-surface hover:text-text rounded-lg px-3 py-2 cursor-pointer inline-flex items-center gap-1.5 transition-colors text-xs font-semibold text-text-muted active:scale-95"
          >
            <FileDown size={14} /> PDF
          </button>
          <button
            onClick={handleExportExcel}
            className="bg-transparent border border-border-soft hover:bg-surface hover:text-text rounded-lg px-3 py-2 cursor-pointer inline-flex items-center gap-1.5 transition-colors text-xs font-semibold text-text-muted active:scale-95"
          >
            <Download size={14} /> Excel
          </button>
        </div>
      </div>

      {loading ? <DashboardSkeleton /> : (
        <div ref={staggerRef} className="flex flex-col gap-5">
          <KpiCardGrid
            stats={dashboard.stats}
            opportunities={dashboard.opportunities}
            accounts={dashboard.accounts}
            onDrillDown={handleOpenDrillDown}
          />

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <div className="lg:col-span-2">
              <PipelineStageChart
                data={dashboard.stageData}
                formatCurrency={formatCurrency}
              />
            </div>
            <SalesVelocityWidget
              avgDaysToClose={dashboard.salesVelocity.avgDaysToClose}
              avgStages={dashboard.salesVelocity.avgStages}
              conversionRate={dashboard.salesVelocity.conversionRate}
              trend={dashboard.salesVelocity.trend}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {dashboard.winRateByUser.length > 0 && (
              <WinRateBySellerWidget
                data={dashboard.winRateByUser}
                formatCurrency={formatCurrency}
              />
            )}
            {dashboard.recentActivity.length > 0 && (
              <ActivityTimeline
                activities={dashboard.recentActivity}
                loading={dashboard.loading}
                onRefresh={dashboard.reload}
              />
            )}
            {dashboard.pipelineComparison.length > 0 && (
              <PipelineComparisonWidget
                pipelines={dashboard.pipelineComparison}
                formatCurrency={formatCurrency}
                onSelectPipeline={(id) => handlePipelineChange(id)}
              />
            )}
          </div>

          <div className="flex flex-col gap-3 pt-2 border-t" style={{ borderColor: 'var(--sys-border-soft)' }}>
            <button
              onClick={() => setShowExtended(!showExtended)}
              className="flex items-center gap-2 text-xs font-semibold text-text-muted hover:text-text transition-colors cursor-pointer w-fit"
            >
              <BarChart3 size={14} />
              Analítica Avanzada
              {showExtended ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>

            {showExtended && (
              <div className="flex flex-col gap-5 pt-1">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                  <CloseReasonsAnalysis
                    wonReasons={dashboard.closeReasons.wonReasons}
                    lostReasons={dashboard.closeReasons.lostReasons}
                    summaryTable={dashboard.closeReasons.summaryTable}
                    formatCurrency={formatCurrency}
                  />
                  <AutomationDashboard />
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <SlidePanel
        open={drillDownOpen}
        onClose={() => { setDrillDownOpen(false); setDrillDownType(null) }}
        title={drillDownTitle}
        width="45rem"
      >
        <div className="flex flex-col gap-4">
          <p className="text-xs" style={{ color: 'var(--sys-text-muted)' }}>
            Listado dinámico bajo demanda para auditoría ejecutiva de registros comerciales.
          </p>
          {drillDownContent}
        </div>
      </SlidePanel>
    </div>
  )
}

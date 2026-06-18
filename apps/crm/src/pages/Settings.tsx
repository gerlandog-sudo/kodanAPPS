import { useState, useEffect } from 'react'
import { PipelineManager } from '../components/settings/PipelineManager'
import { CustomFieldsSettings } from '../components/settings/CustomFieldsSettings'
import { UsersSettings } from '../components/settings/UsersSettings'
import { crmApi } from '../api/client'
import { GitBranch, Settings2, Users, ArrowLeft, ChevronRight, Activity } from 'lucide-react'

type SettingsPanel = 'pipeline' | 'custom-fields' | 'users' | null

export function Settings() {
  const [activePanel, setActivePanel] = useState<SettingsPanel>(null)

  // Estadísticas del Bento Grid
  const [pipelineCount, setPipelineCount] = useState<number | null>(null)
  const [fieldsCount, setFieldsCount] = useState<number | null>(null)
  const [usersCount, setUsersCount] = useState<number | null>(null)
  const [loadingStats, setLoadingStats] = useState(true)

  useEffect(() => {
    async function loadStats() {
      try {
        const [pipelines, accountsFields, contactsFields, oppsFields, usersList] = await Promise.all([
          crmApi.listPipelines(),
          crmApi.listCustomFields('account').catch(() => []),
          crmApi.listCustomFields('contact').catch(() => []),
          crmApi.listCustomFields('opportunity').catch(() => []),
          crmApi.listTenantUsers().catch(() => []),
        ])

        setPipelineCount(pipelines.length)
        setFieldsCount(accountsFields.length + contactsFields.length + oppsFields.length)
        setUsersCount(usersList.filter((u: any) => u.is_active === 1).length)
      } catch (e) {
        console.error('Error al cargar métricas de configuración', e)
      } finally {
        setLoadingStats(false)
      }
    }

    if (activePanel === null) {
      loadStats()
    }
  }, [activePanel])

  if (activePanel !== null) {
    return (
      <div className="flex flex-col gap-6 animate-fade-in font-sans">
        {/* Barra de navegación secundaria */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setActivePanel(null)}
            className="flex items-center justify-center p-2 rounded-lg border border-[var(--sys-border-soft)] hover:bg-[var(--sys-surface-hover)] text-[var(--sys-text-muted)] hover:text-white transition-all cursor-pointer"
            title="Volver a Ajustes"
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--sys-primary)]">
              Configuración de Administración
            </span>
            <h2 className="text-lg font-bold text-white uppercase tracking-wider m-0">
              {activePanel === 'pipeline' && 'Gestión de Canales y Etapas'}
              {activePanel === 'custom-fields' && 'Campos Personalizados'}
              {activePanel === 'users' && 'Usuarios y Accesos'}
            </h2>
          </div>
        </div>

        {/* Panel Activo */}
        <div className="card p-6 border border-[var(--sys-border-soft)] bg-[var(--sys-surface)] rounded-2xl shadow-xl">
          {activePanel === 'pipeline' && <PipelineManager />}
          {activePanel === 'custom-fields' && <CustomFieldsSettings />}
          {activePanel === 'users' && <UsersSettings />}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 animate-fade-in font-sans">
      {/* Cabecera */}
      <div className="flex flex-col gap-1">
        <h2 className="text-2xl font-black text-white tracking-tight uppercase">
          Panel de Configuración del Administrador
        </h2>
        <p className="text-xs text-[var(--sys-text-muted)] max-w-xl leading-relaxed">
          Centraliza la estructura comercial de tu organización. Administra los flujos de ventas, expande la información de tus prospectos o gestiona el equipo de operadores.
        </p>
      </div>

      {/* Bento Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Tarjeta 1: Pipelines */}
        <div
          onClick={() => setActivePanel('pipeline')}
          className="double-bevel-card group relative p-6 bg-[var(--sys-surface)] border border-[var(--sys-border-soft)] hover:border-[var(--sys-primary-soft)] rounded-2xl cursor-pointer overflow-hidden transition-all duration-300 hover:shadow-2xl hover:shadow-[var(--sys-primary-container)]/10"
        >
          {/* Background Accent Soft Glow */}
          <div className="absolute -right-12 -bottom-12 w-36 h-36 bg-[var(--sys-primary)]/5 rounded-full blur-3xl group-hover:bg-[var(--sys-primary)]/10 transition-all duration-300" />
          
          <div className="flex flex-col h-full justify-between gap-6">
            <div className="flex justify-between items-start">
              <div className="p-3 bg-[var(--sys-primary-container)] text-[var(--sys-primary)] rounded-xl border border-[var(--sys-primary-soft)] group-hover:scale-110 transition-transform duration-300">
                <GitBranch size={20} />
              </div>
              <ChevronRight size={16} className="text-[var(--sys-text-muted)] group-hover:translate-x-1 transition-transform" />
            </div>

            <div>
              <h3 className="text-base font-bold text-white uppercase tracking-wider mb-1">
                Canales Comerciales
              </h3>
              <p className="text-xs text-[var(--sys-text-muted)] leading-relaxed">
                Modifica y ordena los pipelines, define etapas de venta y calibra las probabilidades de cierre.
              </p>
            </div>

            <div className="flex items-center justify-between border-t border-[var(--sys-border-soft)] pt-4 mt-auto">
              <span className="text-[10px] uppercase tracking-wider text-[var(--sys-text-muted)] flex items-center gap-1.5">
                <Activity size={12} /> Estado del CRM
              </span>
              <span className="text-sm font-black text-[var(--sys-primary)] font-mono">
                {loadingStats ? '...' : `${pipelineCount} Activo${pipelineCount !== 1 ? 's' : ''}`}
              </span>
            </div>
          </div>
        </div>

        {/* Tarjeta 2: Campos Personalizados */}
        <div
          onClick={() => setActivePanel('custom-fields')}
          className="double-bevel-card group relative p-6 bg-[var(--sys-surface)] border border-[var(--sys-border-soft)] hover:border-[var(--sys-secondary-soft)] rounded-2xl cursor-pointer overflow-hidden transition-all duration-300 hover:shadow-2xl hover:shadow-[var(--sys-secondary-container)]/10"
        >
          <div className="absolute -right-12 -bottom-12 w-36 h-36 bg-[var(--sys-secondary)]/5 rounded-full blur-3xl group-hover:bg-[var(--sys-secondary)]/10 transition-all duration-300" />

          <div className="flex flex-col h-full justify-between gap-6">
            <div className="flex justify-between items-start">
              <div className="p-3 bg-[var(--sys-surface-light)] text-[var(--sys-text-muted)] rounded-xl border border-[var(--sys-border-soft)] group-hover:scale-110 transition-transform duration-300">
                <Settings2 size={20} className="text-[var(--sys-primary)]" />
              </div>
              <ChevronRight size={16} className="text-[var(--sys-text-muted)] group-hover:translate-x-1 transition-transform" />
            </div>

            <div>
              <h3 className="text-base font-bold text-white uppercase tracking-wider mb-1">
                Campos Personalizados
              </h3>
              <p className="text-xs text-[var(--sys-text-muted)] leading-relaxed">
                Agrega campos dinámicos tipados a Cuentas, Contactos y Oportunidades sin alterar el core.
              </p>
            </div>

            <div className="flex items-center justify-between border-t border-[var(--sys-border-soft)] pt-4 mt-auto">
              <span className="text-[10px] uppercase tracking-wider text-[var(--sys-text-muted)] flex items-center gap-1.5">
                <Activity size={12} /> Atributos Dinámicos
              </span>
              <span className="text-sm font-black text-white font-mono">
                {loadingStats ? '...' : `${fieldsCount} Campo${fieldsCount !== 1 ? 's' : ''}`}
              </span>
            </div>
          </div>
        </div>

        {/* Tarjeta 3: Usuarios y Permisos */}
        <div
          onClick={() => setActivePanel('users')}
          className="double-bevel-card group relative p-6 bg-[var(--sys-surface)] border border-[var(--sys-border-soft)] hover:border-[var(--sys-primary-soft)] rounded-2xl cursor-pointer overflow-hidden transition-all duration-300 hover:shadow-2xl hover:shadow-[var(--sys-primary-container)]/10"
        >
          <div className="absolute -right-12 -bottom-12 w-36 h-36 bg-[var(--sys-primary)]/5 rounded-full blur-3xl group-hover:bg-[var(--sys-primary)]/10 transition-all duration-300" />

          <div className="flex flex-col h-full justify-between gap-6">
            <div className="flex justify-between items-start">
              <div className="p-3 bg-[var(--sys-primary-container)] text-[var(--sys-primary)] rounded-xl border border-[var(--sys-primary-soft)] group-hover:scale-110 transition-transform duration-300">
                <Users size={20} />
              </div>
              <ChevronRight size={16} className="text-[var(--sys-text-muted)] group-hover:translate-x-1 transition-transform" />
            </div>

            <div>
              <h3 className="text-base font-bold text-white uppercase tracking-wider mb-1">
                Usuarios y Accesos
              </h3>
              <p className="text-xs text-[var(--sys-text-muted)] leading-relaxed">
                Da de alta operadores, edita la información del equipo y asigna roles del CRM.
              </p>
            </div>

            <div className="flex items-center justify-between border-t border-[var(--sys-border-soft)] pt-4 mt-auto">
              <span className="text-[10px] uppercase tracking-wider text-[var(--sys-text-muted)] flex items-center gap-1.5">
                <Activity size={12} /> Operadores Activos
              </span>
              <span className="text-sm font-black text-[var(--sys-primary)] font-mono">
                {loadingStats ? '...' : `${usersCount} Operador${usersCount !== 1 ? 'es' : ''}`}
              </span>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}

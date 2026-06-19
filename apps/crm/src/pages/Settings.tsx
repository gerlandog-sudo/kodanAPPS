import { useState, useEffect, useCallback } from 'react'
import { AdminLayout } from '@kodan-apps/ui-core'
import type { AdminSection } from '@kodan-apps/ui-core'
import { PipelineManager } from '../components/settings/PipelineManager'
import { CustomFieldsSettings } from '../components/settings/CustomFieldsSettings'
import { UsersSettings } from '../components/settings/UsersSettings'
import { crmApi } from '../api/client'
import { GitBranch, Settings2, Users, ChevronRight, Activity } from 'lucide-react'

type SettingsPanel = 'users' | 'pipelines' | 'custom-fields' | null

function getSectionFromHash(): SettingsPanel {
  const hash = window.location.hash.replace('#', '')
  if (hash === 'users' || hash === 'pipelines' || hash === 'custom-fields') return hash
  return null
}

export function Settings() {
  const [activePanel, setActivePanel] = useState<SettingsPanel>(getSectionFromHash)
  const [pipelineCount, setPipelineCount] = useState<number | null>(null)
  const [fieldsCount, setFieldsCount] = useState<number | null>(null)
  const [usersCount, setUsersCount] = useState<number | null>(null)

  useEffect(() => {
    const onHashChange = () => setActivePanel(getSectionFromHash())
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  const navigate = (section: string) => {
    if (!section) {
      window.history.pushState(null, '', window.location.pathname)
      setActivePanel(null)
    } else {
      window.history.pushState(null, '', `#${section}`)
      setActivePanel(section as SettingsPanel)
    }
  }

  const loadStats = useCallback(async () => {
    try {
      const [pipelines, accountsFields, contactsFields, oppsFields, usersList] = await Promise.all([
        crmApi.listPipelines().catch(() => []),
        crmApi.listCustomFields('account').catch(() => []),
        crmApi.listCustomFields('contact').catch(() => []),
        crmApi.listCustomFields('opportunity').catch(() => []),
        crmApi.listTenantUsers().catch(() => []),
      ])
      setPipelineCount(pipelines.length)
      setFieldsCount(accountsFields.length + contactsFields.length + oppsFields.length)
      setUsersCount(usersList.filter((u: any) => u.is_active === 1).length)
    } catch (e) {
      console.error('Error al cargar métricas', e)
    }
  }, [])

  useEffect(() => { loadStats() }, [activePanel])

  const SETTINGS_SECTIONS: AdminSection[] = [
    { key: 'users', label: 'Usuarios y Accesos', icon: <Users size={16} />, description: 'Operadores activos', count: usersCount ?? 0, href: '#users' },
    { key: 'pipelines', label: 'Canales Comerciales', icon: <GitBranch size={16} />, description: 'Pipelines activos', count: pipelineCount ?? 0, href: '#pipelines' },
    { key: 'custom-fields', label: 'Campos Personalizados', icon: <Settings2 size={16} />, description: 'Atributos dinámicos', count: fieldsCount ?? 0, href: '#custom-fields' },
  ]

  if (activePanel !== null) {
    return (
      <AdminLayout sections={SETTINGS_SECTIONS} activeSection={activePanel} onNavigate={navigate}>
        {activePanel === 'pipelines' && <PipelineManager />}
        {activePanel === 'custom-fields' && <CustomFieldsSettings />}
        {activePanel === 'users' && <UsersSettings />}
      </AdminLayout>
    )
  }

  return (
    <div className="flex flex-col gap-6 animate-fade-in font-sans">
      <div className="flex flex-col gap-1">
        <h2 className="text-2xl font-black text-[var(--sys-text)] tracking-tight uppercase">
          Ajustes del Sistema
        </h2>
        <p className="text-xs text-[var(--sys-text-muted)] max-w-xl leading-relaxed">
          Centraliza la estructura comercial de tu organización. Administra los flujos de ventas, expande la información de tus prospectos o gestiona el equipo de operadores.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {([
          { key: 'pipelines' as const, icon: <GitBranch size={20} />, title: 'Canales Comerciales', desc: 'Modifica y ordena los pipelines, define etapas de venta y calibra las probabilidades de cierre.', metric: 'Estado del CRM', value: `${pipelineCount ?? '...'} Activo${pipelineCount !== 1 ? 's' : ''}` },
          { key: 'custom-fields' as const, icon: <Settings2 size={20} />, title: 'Campos Personalizados', desc: 'Agrega campos dinámicos tipados a Cuentas, Contactos y Oportunidades.', metric: 'Atributos Dinámicos', value: `${fieldsCount ?? '...'} Campo${fieldsCount !== 1 ? 's' : ''}` },
          { key: 'users' as const, icon: <Users size={20} />, title: 'Usuarios y Accesos', desc: 'Da de alta operadores, edita la información del equipo y asigna roles del CRM.', metric: 'Operadores Activos', value: `${usersCount ?? '...'} Operador${usersCount !== 1 ? 'es' : ''}` },
        ]).map(({ key, icon, title, desc, metric, value }) => (
          <div key={key} onClick={() => navigate(key)}
            className="double-bevel-card group relative p-6 bg-[var(--sys-surface-raised)] border border-[var(--sys-border-soft)] hover:border-[var(--sys-primary)] rounded-2xl cursor-pointer overflow-hidden transition-all duration-300 hover:shadow-2xl hover:shadow-[var(--sys-primary)]/5">
            <div className="absolute -right-12 -bottom-12 w-36 h-36 bg-[var(--sys-primary)]/5 rounded-full blur-3xl group-hover:bg-[var(--sys-primary)]/10 transition-all duration-300" />
            <div className="flex flex-col h-full justify-between gap-6">
              <div className="flex justify-between items-start">
                <div className="p-3 bg-[var(--sys-surface)] text-[var(--sys-primary)] rounded-xl border border-[var(--sys-border-soft)] group-hover:scale-110 transition-transform duration-300">
                  {icon}
                </div>
                <ChevronRight size={16} className="text-[var(--sys-text-muted)] group-hover:translate-x-1 transition-transform" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[var(--sys-text)] uppercase tracking-wider mb-1">{title}</h3>
                <p className="text-xs text-[var(--sys-text-muted)] leading-relaxed">{desc}</p>
              </div>
              <div className="flex items-center justify-between border-t border-[var(--sys-border-soft)] pt-4 mt-auto">
                <span className="text-[10px] uppercase tracking-wider text-[var(--sys-text-muted)] flex items-center gap-1.5">
                  <Activity size={12} /> {metric}
                </span>
                <span className="text-sm font-black text-[var(--sys-primary)] font-mono">{value}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

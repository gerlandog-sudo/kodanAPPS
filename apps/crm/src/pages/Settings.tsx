import { useState } from 'react'
import { AdminLayout } from '@kodan-apps/ui-core'
import type { AdminSection } from '@kodan-apps/ui-core'
import { PipelineManager } from '../components/settings/PipelineManager'
import { UsersSettingsPanel, EmailTemplatesSettingsPanel, SmtpSettingsPanel, CustomFieldsSettingsPanel, TaskTypesSettingsPanel } from '@kodan-apps/ui-core'
import { NotificationsSettings } from '../components/settings/NotificationsSettings'
import { WorkflowManager } from '../components/settings/WorkflowManager'
import { GitBranch, Settings2, Users, BellRing, ListTodo, Workflow, Mail, Server } from 'lucide-react'

type SettingsPanel = 'users' | 'pipelines' | 'custom-fields' | 'notifications' | 'task-types' | 'workflows' | 'email-templates' | 'smtp'

const STORAGE_KEY = 'kodan_crm_settings_panel'

function getStoredSection(): SettingsPanel {
  const stored = sessionStorage.getItem(STORAGE_KEY)
  if (stored && ['users', 'pipelines', 'custom-fields', 'notifications', 'task-types', 'workflows', 'email-templates', 'smtp'].includes(stored)) {
    return stored as SettingsPanel
  }
  return 'users'
}

export function Settings() {
  const [activePanel, setActivePanel] = useState<SettingsPanel>(
    () => getStoredSection()
  )

  const navigate = (section: string) => {
    sessionStorage.setItem(STORAGE_KEY, section)
    setActivePanel(section as SettingsPanel)
  }

  const SETTINGS_SECTIONS: AdminSection[] = [
    { key: 'users', label: 'Usuarios', icon: <Users size={16} />, href: '' },
    { key: 'pipelines', label: 'Canales', icon: <GitBranch size={16} />, href: '' },
    { key: 'custom-fields', label: 'Campos', icon: <Settings2 size={16} />, href: '' },
    { key: 'email-templates', label: 'Plantillas de Correo', icon: <Mail size={16} />, href: '' },
    { key: 'smtp', label: 'Configuración SMTP', icon: <Server size={16} />, href: '' },
    { key: 'notifications', label: 'Alertas', icon: <BellRing size={16} />, href: '' },
    { key: 'task-types', label: 'Tipos de Tareas', icon: <ListTodo size={16} />, href: '' },
    { key: 'workflows', label: 'Workflows', icon: <Workflow size={16} />, href: '' },
  ]

  return (
    <AdminLayout sections={SETTINGS_SECTIONS} activeSection={activePanel} onNavigate={navigate}>
      {activePanel === 'pipelines' && <PipelineManager />}
      {activePanel === 'custom-fields' && <CustomFieldsSettingsPanel />}
      {activePanel === 'users' && <UsersSettingsPanel appId="crm" />}
      {activePanel === 'email-templates' && <EmailTemplatesSettingsPanel moduleContext="crm" />}
      {activePanel === 'smtp' && <SmtpSettingsPanel />}
      {activePanel === 'notifications' && <NotificationsSettings />}
      {activePanel === 'task-types' && <TaskTypesSettingsPanel moduleContext="crm" />}
      {activePanel === 'workflows' && <WorkflowManager />}
    </AdminLayout>
  )
}

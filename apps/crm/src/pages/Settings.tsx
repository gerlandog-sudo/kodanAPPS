import { useState, useEffect } from 'react'
import { AdminLayout } from '@kodan-apps/ui-core'
import type { AdminSection } from '@kodan-apps/ui-core'
import { PipelineManager } from '../components/settings/PipelineManager'
import { CustomFieldsSettings } from '../components/settings/CustomFieldsSettings'
import { UsersSettings } from '../components/settings/UsersSettings'
import { NotificationsSettings } from '../components/settings/NotificationsSettings'
import { TasksSettings } from '../components/settings/TasksSettings'
import { WorkflowManager } from '../components/settings/WorkflowManager'
import { GitBranch, Settings2, Users, BellRing, ListTodo, Workflow } from 'lucide-react'

type SettingsPanel = 'users' | 'pipelines' | 'custom-fields' | 'notifications' | 'task-types' | 'workflows'

function getSectionFromHash(): SettingsPanel | null {
  const hash = window.location.hash.replace('#', '')
  if (hash === 'users' || hash === 'pipelines' || hash === 'custom-fields' || hash === 'notifications' || hash === 'task-types' || hash === 'workflows') return hash
  return null
}

export function Settings() {
  const [activePanel, setActivePanel] = useState<SettingsPanel>(
    () => getSectionFromHash() || 'users'
  )

  useEffect(() => {
    const onHashChange = () => {
      const section = getSectionFromHash()
      if (section) setActivePanel(section)
    }
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  const navigate = (section: string) => {
    window.history.pushState(null, '', `#${section}`)
    setActivePanel(section as SettingsPanel)
  }

  const SETTINGS_SECTIONS: AdminSection[] = [
    { key: 'users', label: 'Usuarios', icon: <Users size={16} />, href: '#users' },
    { key: 'pipelines', label: 'Canales', icon: <GitBranch size={16} />, href: '#pipelines' },
    { key: 'custom-fields', label: 'Campos', icon: <Settings2 size={16} />, href: '#custom-fields' },
    { key: 'notifications', label: 'Alertas', icon: <BellRing size={16} />, href: '#notifications' },
    { key: 'task-types', label: 'Tipos de Tareas', icon: <ListTodo size={16} />, href: '#task-types' },
    { key: 'workflows', label: 'Workflows', icon: <Workflow size={16} />, href: '#workflows' },
  ]

  return (
    <AdminLayout sections={SETTINGS_SECTIONS} activeSection={activePanel} onNavigate={navigate}>
      {activePanel === 'pipelines' && <PipelineManager />}
      {activePanel === 'custom-fields' && <CustomFieldsSettings />}
      {activePanel === 'users' && <UsersSettings />}
      {activePanel === 'notifications' && <NotificationsSettings />}
      {activePanel === 'task-types' && <TasksSettings />}
      {activePanel === 'workflows' && <WorkflowManager />}
    </AdminLayout>
  )
}

import { useState } from 'react'
import { PipelineManager } from '../components/settings/PipelineManager'
import { CustomFieldsSettings } from '../components/settings/CustomFieldsSettings'
import { Settings2, GitBranch } from 'lucide-react'

type SettingsTab = 'pipeline' | 'custom-fields'

export function Settings() {
  const [activeTab, setActiveTab] = useState<SettingsTab>('pipeline')

  const tabs: { key: SettingsTab; label: string; icon: React.ReactNode }[] = [
    { key: 'pipeline', label: 'Pipeline Manager', icon: <GitBranch size={16} /> },
    { key: 'custom-fields', label: 'Campos Personalizados', icon: <Settings2 size={16} /> },
  ]

  return (
    <div className="flex flex-col gap-6">

      <div className="flex gap-1 p-1 rounded-lg" style={{ background: 'var(--sys-surface)', border: '1px solid var(--sys-border-soft)', width: 'fit-content' }}>
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className="btn"
            style={{
              background: activeTab === tab.key ? 'var(--sys-primary-container)' : 'transparent',
              color: activeTab === tab.key ? 'var(--color-on-primary-container)' : 'var(--sys-text-muted)',
              fontWeight: activeTab === tab.key ? 600 : 500,
            }}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'pipeline' && <PipelineManager />}
      {activeTab === 'custom-fields' && <CustomFieldsSettings />}
    </div>
  )
}

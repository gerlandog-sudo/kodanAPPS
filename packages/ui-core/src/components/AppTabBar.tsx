import { MoreVertical, Edit, Trash2 } from 'lucide-react';
import type { AppItem, AppMetricItem } from '../hooks/useAppMetricsManager';

interface AppTabBarProps {
  apps: AppItem[];
  metrics: AppMetricItem[];
  tabIndex: number;
  openMenuTab: string | null;
  onTabChange: (index: number) => void;
  onOpenMenu: (appId: string | null) => void;
  onEditApp: (app: AppItem) => void;
  onDeleteApp: (app: AppItem) => void;
}

export function AppTabBar({ apps, metrics, tabIndex, openMenuTab, onTabChange, onOpenMenu, onEditApp, onDeleteApp }: AppTabBarProps) {
  if (apps.length === 0) return null;

  return (
    <div className="flex gap-1 mb-4 items-center">
      {apps.map((app, i) => (
        <div key={app.app_id} className="relative group/tab">
          <button
            onClick={() => onTabChange(i)}
            className="px-4 h-9 rounded-lg text-xs font-semibold transition-all flex items-center gap-1 duration-100"
            style={{
              background: tabIndex === i ? 'var(--sys-primary-container)' : 'transparent',
              color: tabIndex === i ? 'var(--color-on-primary-container)' : 'var(--sys-text-muted)',
            }}
            onMouseEnter={(e) => { if (tabIndex !== i) { e.currentTarget.style.background = 'var(--sys-surface-hover)'; } }}
            onMouseLeave={(e) => { if (tabIndex !== i) { e.currentTarget.style.background = 'transparent'; } }}
          >
            {app.name}
            <span className="ml-1 opacity-60" style={tabIndex === i ? { color: 'var(--sys-on-primary)' } : { color: 'var(--sys-text-muted)' }}>
              ({metrics.filter(m => m.app_id === app.app_id).length})
            </span>
          </button>
          <button
            onClick={() => onOpenMenu(openMenuTab === app.app_id ? null : app.app_id)}
            className="absolute -top-1 -right-1 p-0.5 rounded-full opacity-0 group-hover/tab:opacity-100 transition-opacity"
            style={{ background: 'var(--sys-surface)', border: '1px solid var(--sys-border-soft)' }}
          >
            <MoreVertical size={10} />
          </button>
          {openMenuTab === app.app_id && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => onOpenMenu(null)} />
              <div className="absolute right-0 top-full mt-1 z-50 min-w-[140px] rounded-lg shadow-lg py-1" style={{ background: 'var(--sys-surface)', border: '1px solid var(--sys-border-soft)' }}>
                <button
                  onClick={() => { onOpenMenu(null); onEditApp(app); }}
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:opacity-80"
                  style={{ color: 'var(--sys-text)' }}
                >
                  <Edit size={12} /> Editar app
                </button>
                <button
                  onClick={() => { onOpenMenu(null); onDeleteApp(app); }}
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:opacity-80"
                  style={{ color: 'var(--sys-error)' }}
                >
                  <Trash2 size={12} /> Eliminar app
                </button>
              </div>
            </>
          )}
        </div>
      ))}
    </div>
  );
}

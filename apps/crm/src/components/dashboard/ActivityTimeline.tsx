import { useEffect, useRef } from 'react'
import { Activity, RefreshCw } from 'lucide-react'
import gsap from 'gsap'

interface Activity {
  type: string
  message: string
  userName: string
  timestamp: string
  entityType: string
  entityId: number
}

interface ActivityItemProps {
  activity: Activity
  index: number
  total: number
}

interface ActivityTimelineProps {
  activities: Activity[]
  loading?: boolean
  onRefresh?: () => void
}

const ACTIVITY_ICONS: Record<string, { icon: string; color: string }> = {
  stage_changed: { icon: '→', color: 'var(--sys-primary)' },
  created: { icon: '+', color: 'var(--sys-success)' },
  won: { icon: '🏆', color: 'var(--sys-success)' },
  lost: { icon: '✕', color: 'var(--sys-error)' },
  task_created: { icon: '📋', color: 'var(--sys-tertiary)' },
  task_completed: { icon: '✓', color: 'var(--sys-success)' },
  assigned: { icon: '→', color: 'var(--sys-primary)' },
}

function getRelativeTime(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'hace un momento'
  if (mins < 60) return `hace ${mins}min`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `hace ${hours}h`
  const days = Math.floor(hours / 24)
  return `hace ${days}d`
}

function ActivityItem({ activity, index, total }: ActivityItemProps) {
  const itemRef = useRef<HTMLDivElement>(null!)
  const icon = ACTIVITY_ICONS[activity.type]
  const color = icon?.color || 'var(--sys-text-muted)'

  useEffect(() => {
    if (!itemRef.current) return
    gsap.fromTo(itemRef.current, { opacity: 0, x: -8 }, { opacity: 1, x: 0, duration: 0.3, delay: index * 0.04, ease: 'power2.out' })
  }, [index])

  return (
    <div ref={itemRef} className="flex items-start gap-3 py-2.5 px-3 rounded-lg transition-colors hover:bg-surface-hover/30">
      <div className="flex flex-col items-center gap-1 shrink-0">
        <span className="size-7 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0" style={{ background: `color-mix(in srgb, ${color} 15%, transparent)`, color }}>
          {icon?.icon || '•'}
        </span>
        {index < total - 1 && <div className="w-px flex-1 min-h-4" style={{ background: 'var(--sys-border-soft)' }} />}
      </div>
      <div className="flex flex-col gap-0.5 min-w-0 flex-1">
        <span className="text-xs font-medium" style={{ color: 'var(--sys-text)' }}>{activity.message}</span>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-semibold" style={{ color: 'var(--sys-text-muted)' }}>{activity.userName}</span>
          <span className="text-[9px]" style={{ color: 'var(--sys-text-muted)', opacity: 0.6 }}>{getRelativeTime(activity.timestamp)}</span>
        </div>
      </div>
    </div>
  )
}

export function ActivityTimeline({ activities, loading, onRefresh }: ActivityTimelineProps) {
  const displayActivities = activities.length > 0 ? activities.slice(0, 8) : []

  return (
    <div className="glass-panel p-6 flex flex-col gap-3" style={{ borderRadius: 'var(--radius-lg)' }}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity size={16} style={{ color: 'var(--sys-primary)' }} />
          <h2 className="text-sm font-bold uppercase tracking-wider" style={{ color: 'var(--sys-text-muted)' }}>Actividad Reciente</h2>
        </div>
        {onRefresh && (
          <button
            onClick={onRefresh}
            className="bg-transparent border-none p-1.5 rounded-lg cursor-pointer hover:bg-surface-hover transition-colors"
            style={{ color: 'var(--sys-text-muted)' }}
            title="Actualizar"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        )}
      </div>

      <div className="flex flex-col max-h-[320px] overflow-y-auto scrollbar-none -mx-3">
        {displayActivities.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center gap-2">
            <Activity size={24} className="opacity-20" style={{ color: 'var(--sys-text-muted)' }} />
            <span className="text-xs font-medium" style={{ color: 'var(--sys-text-muted)' }}>Sin actividad reciente</span>
            <span className="text-[10px] px-8" style={{ color: 'var(--sys-text-muted)', opacity: 0.6 }}>
              La actividad del pipeline aparecerá aquí a medida que ocurran cambios.
            </span>
          </div>
        ) : (
          displayActivities.map((act, i) => (
            <ActivityItem key={`${act.entityType}-${act.entityId}-${i}`} activity={act} index={i} total={displayActivities.length} />
          ))
        )}
      </div>
    </div>
  )
}

export { ActivityItem }

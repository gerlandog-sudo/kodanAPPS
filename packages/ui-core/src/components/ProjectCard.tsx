import { Trash2, Briefcase, Info, Clock, Pencil } from 'lucide-react'

export interface ProjectCardProps {
  id: number
  name: string
  clientName?: string
  startDate?: string
  endDate?: string
  status: 'active' | 'paused' | 'completed'
  colorHex?: string
  budgetMoney?: number
  actualCost?: number
  budgetHours?: number
  actualHours?: number
  onEdit?: () => void
  onDelete?: () => void
  onNavigateToBoard?: () => void
}

function formatDate(dateStr?: string) {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function CircularProgress({ percentage, color }: { percentage: number; color: string }) {
  const radius = 14
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (Math.min(100, Math.max(0, percentage)) / 100) * circumference

  return (
    <div style={{ position: 'relative', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      <svg width="36" height="36" viewBox="0 0 36 36" style={{ transform: 'rotate(-90deg)' }}>
        {/* Background circle */}
        <circle
          cx="18"
          cy="18"
          r={radius}
          fill="transparent"
          stroke="var(--sys-border-soft)"
          strokeWidth="3"
          style={{ opacity: 0.5 }}
        />
        {/* Progress circle */}
        <circle
          cx="18"
          cy="18"
          r={radius}
          fill="transparent"
          stroke={color}
          strokeWidth="3"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.35s ease' }}
        />
      </svg>
      <span style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        fontSize: '9px',
        fontWeight: 700,
        color: 'var(--sys-text)',
        fontFamily: 'monospace'
      }}>
        {Math.round(percentage)}%
      </span>
    </div>
  )
}

export function ProjectCard({
  name,
  clientName = 'Cliente General',
  startDate,
  endDate,
  status,
  colorHex,
  budgetMoney = 0,
  actualCost = 0,
  budgetHours = 0,
  actualHours = 0,
  onEdit,
  onDelete,
  onNavigateToBoard,
}: ProjectCardProps) {
  // Status styling logic
  let statusLabel = 'ACTIVO'
  let statusStyle = {
    background: 'color-mix(in srgb, var(--sys-success) 12%, transparent)',
    color: 'var(--sys-success)',
    border: '1px solid color-mix(in srgb, var(--sys-success) 20%, transparent)',
  }

  if (status === 'paused') {
    statusLabel = 'PAUSADO'
    statusStyle = {
      background: 'color-mix(in srgb, var(--sys-warning) 12%, transparent)',
      color: 'var(--sys-warning)',
      border: '1px solid color-mix(in srgb, var(--sys-warning) 20%, transparent)',
    }
  } else if (status === 'completed') {
    statusLabel = 'COMPLETADO'
    statusStyle = {
      background: 'color-mix(in srgb, var(--sys-primary) 12%, transparent)',
      color: 'var(--sys-primary)',
      border: '1px solid color-mix(in srgb, var(--sys-primary) 20%, transparent)',
    }
  }

  // Cost calculations
  const moneyProgress = budgetMoney > 0 ? (actualCost / budgetMoney) * 100 : 0
  const isMoneyOverBudget = actualCost > budgetMoney
  const moneyProgressColor = isMoneyOverBudget ? '#991b1b' : 'var(--sys-success)'

  const deviation = budgetMoney - actualCost
  const percentDev = budgetMoney > 0 ? Math.round((deviation / budgetMoney) * 100) : 0
  const isDevNegative = deviation < 0

  // Hours calculations
  const hoursProgress = budgetHours > 0 ? (actualHours / budgetHours) * 100 : 0
  const isHoursOverBudget = actualHours > budgetHours
  const hoursProgressColor = isHoursOverBudget ? '#991b1b' : '#c2410c' // Orange/brown as reference

  const remainingHours = budgetHours - actualHours
  const percentRemaining = budgetHours > 0 ? Math.round((remainingHours / budgetHours) * 100) : 0
  const isRemainingNegative = remainingHours < 0

  const displayDates = startDate && endDate ? `${formatDate(startDate)} → ${formatDate(endDate)}` : ''

  return (
    <div
      onClick={onEdit}
      style={{
        padding: '1.25rem',
        cursor: onEdit ? 'pointer' : 'default',
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem',
        borderRadius: '0.75rem',
        border: colorHex ? `1px solid ${colorHex}` : '1px solid var(--sys-border-soft)',
        background: colorHex 
          ? `color-mix(in srgb, ${colorHex} 4%, var(--sys-surface-raised))`
          : 'color-mix(in srgb, var(--sys-surface) 80%, transparent)',
        userSelect: 'none',
        transition: 'all 300ms ease',
        position: 'relative',
      }}
      onMouseEnter={(e) => {
        const el = e.currentTarget
        el.style.borderColor = colorHex ? colorHex : 'color-mix(in srgb, var(--sys-primary) 45%, var(--sys-border-soft))'
        el.style.background = colorHex 
          ? `color-mix(in srgb, ${colorHex} 8%, var(--sys-surface-raised))`
          : 'var(--sys-surface)'
        el.style.transform = 'translateY(-3px)'
        el.style.boxShadow = '0 12px 30px -8px rgba(0,0,0,0.2)'
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget
        el.style.borderColor = colorHex ? colorHex : 'var(--sys-border-soft)'
        el.style.transform = 'translateY(0)'
        el.style.boxShadow = 'none'
        el.style.background = colorHex 
          ? `color-mix(in srgb, ${colorHex} 4%, var(--sys-surface-raised))`
          : 'color-mix(in srgb, var(--sys-surface) 80%, transparent)'
      }}
    >
      {/* Top Header section */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        {/* Status Badge */}
        <div>
          <span style={{
            fontSize: '10px',
            fontWeight: 700,
            padding: '0.125rem 0.5rem',
            borderRadius: '999px',
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
            display: 'inline-block',
            ...statusStyle
          }}>
            {statusLabel}
          </span>
        </div>

        {/* Action buttons on the right */}
        <div 
          onClick={(e) => e.stopPropagation()} 
          style={{ display: 'flex', flexDirection: 'row', gap: '0.5rem', alignItems: 'center' }}
        >
          {onNavigateToBoard && (
            <button
              type="button"
              onClick={onNavigateToBoard}
              title="Ir al Tablero del Proyecto"
              style={{
                width: '2.25rem',
                height: '2.25rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '0.5rem',
                border: '1px solid var(--sys-border-soft)',
                background: 'var(--sys-surface-raised)',
                color: 'var(--sys-text-muted)',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={e => {
                const b = e.currentTarget
                b.style.color = 'var(--sys-primary)'
                b.style.borderColor = 'color-mix(in srgb, var(--sys-primary) 40%, transparent)'
                b.style.background = 'color-mix(in srgb, var(--sys-primary) 8%, transparent)'
              }}
              onMouseLeave={e => {
                const b = e.currentTarget
                b.style.color = 'var(--sys-text-muted)'
                b.style.borderColor = 'var(--sys-border-soft)'
                b.style.background = 'var(--sys-surface-raised)'
              }}
            >
              <Briefcase size={16} />
            </button>
          )}

          {onEdit && (
            <button
              type="button"
              onClick={onEdit}
              title="Editar Proyecto"
              style={{
                width: '2.25rem',
                height: '2.25rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '0.5rem',
                border: '1px solid var(--sys-border-soft)',
                background: 'var(--sys-surface-raised)',
                color: 'var(--sys-text-muted)',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={e => {
                const b = e.currentTarget
                b.style.color = 'var(--sys-primary)'
                b.style.borderColor = 'color-mix(in srgb, var(--sys-primary) 40%, transparent)'
                b.style.background = 'color-mix(in srgb, var(--sys-primary) 8%, transparent)'
              }}
              onMouseLeave={e => {
                const b = e.currentTarget
                b.style.color = 'var(--sys-text-muted)'
                b.style.borderColor = 'var(--sys-border-soft)'
                b.style.background = 'var(--sys-surface-raised)'
              }}
            >
              <Pencil size={15} />
            </button>
          )}

          {onDelete && (
            <button
              type="button"
              onClick={onDelete}
              title="Eliminar Proyecto"
              style={{
                width: '2.25rem',
                height: '2.25rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '0.5rem',
                border: 'none',
                background: 'transparent',
                color: 'var(--sys-text-muted)',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={e => {
                const b = e.currentTarget
                b.style.color = 'var(--sys-error)'
                b.style.background = 'color-mix(in srgb, var(--sys-error) 10%, transparent)'
              }}
              onMouseLeave={e => {
                const b = e.currentTarget
                b.style.color = 'var(--sys-text-muted)'
                b.style.background = 'transparent'
              }}
            >
              <Trash2 size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Info section: Title, Client Name, Dates */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
        <h3 style={{
          margin: 0,
          fontSize: '1.25rem',
          fontWeight: 700,
          color: 'var(--sys-text)',
          lineHeight: 1.25,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          fontFamily: 'var(--font-hanken-grotesk, system-ui)',
        }}>
          {name}
        </h3>

        <span style={{
          fontSize: '0.875rem',
          color: 'var(--sys-text-muted)',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          fontFamily: 'var(--font-hanken-grotesk, system-ui)'
        }}>
          {clientName}
        </span>

        {displayDates && (
          <span style={{
            fontSize: '0.75rem',
            color: 'var(--sys-text-muted)',
            fontFamily: 'monospace',
            marginTop: '0.125rem'
          }}>
            {displayDates}
          </span>
        )}
      </div>

      {/* Columns Container */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
        {/* DINERO Column */}
        <div style={{
          border: '1px solid var(--sys-border-soft)',
          borderRadius: '0.75rem',
          padding: '0.75rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.5rem',
          background: 'color-mix(in srgb, var(--sys-surface-raised) 40%, transparent)',
        }}>
          {/* Header row */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <span style={{ fontWeight: 800, color: 'var(--sys-success)', fontSize: '13px' }}>$</span>
              <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--sys-success)', letterSpacing: '0.05em' }}>DINERO</span>
            </div>
            <CircularProgress percentage={moneyProgress} color={moneyProgressColor} />
          </div>

          {/* Details */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem', fontSize: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--sys-text-muted)' }}>Presupuesto</span>
              <span style={{ fontWeight: 700, color: 'var(--sys-text)' }}>
                ${budgetMoney.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--sys-text-muted)' }}>Costo Actual</span>
              <span style={{ fontWeight: 700, color: 'var(--sys-text)' }}>
                ${actualCost.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            
            {/* Divider */}
            <div style={{ borderTop: '1px dashed var(--sys-border-soft)', margin: '0.125rem 0' }} />

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: 'var(--sys-text-muted)', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                Desvío <Info size={12} style={{ opacity: 0.6 }} />
              </span>
              <span style={{ 
                fontWeight: 700, 
                color: isDevNegative ? 'var(--sys-error)' : 'var(--sys-success)' 
              }}>
                {isDevNegative ? '-' : '+'}${Math.abs(deviation).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ({percentDev > 0 ? `+${percentDev}` : percentDev}%)
              </span>
            </div>
          </div>
        </div>

        {/* HORAS Column */}
        <div style={{
          border: '1px solid var(--sys-border-soft)',
          borderRadius: '0.75rem',
          padding: '0.75rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.5rem',
          background: 'color-mix(in srgb, var(--sys-surface-raised) 40%, transparent)',
        }}>
          {/* Header row */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
              <Clock size={13} style={{ color: 'var(--sys-text)' }} />
              <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--sys-text)', letterSpacing: '0.05em' }}>HORAS</span>
            </div>
            <CircularProgress percentage={hoursProgress} color={hoursProgressColor} />
          </div>

          {/* Details */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem', fontSize: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--sys-text-muted)' }}>Presupuesto (Hs)</span>
              <span style={{ fontWeight: 700, color: 'var(--sys-text)' }}>{budgetHours}h</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--sys-text-muted)' }}>Consumido</span>
              <span style={{ fontWeight: 700, color: 'var(--sys-text)' }}>{actualHours}h</span>
            </div>
            
            {/* Divider */}
            <div style={{ borderTop: '1px dashed var(--sys-border-soft)', margin: '0.125rem 0' }} />

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: 'var(--sys-text-muted)', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                Sin Consumir <Info size={12} style={{ opacity: 0.6 }} />
              </span>
              <span style={{ 
                fontWeight: 700, 
                color: isRemainingNegative ? 'var(--sys-error)' : 'var(--sys-success)' 
              }}>
                {remainingHours.toFixed(1)}h ({percentRemaining}%)
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

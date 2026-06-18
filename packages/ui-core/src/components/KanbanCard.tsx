import { ReactNode } from 'react';

export interface KanbanCardAction {
  icon: ReactNode;
  label: string;
  onClick: () => void;
  variant?: 'default' | 'danger';
  show?: boolean;
}

export interface KanbanCardMetadata {
  icon?: ReactNode;
  label: string;
  weight?: 'normal' | 'medium' | 'semibold' | 'bold';
  size?: string;
}

export interface KanbanCardAssignee {
  name: string;
  avatar?: string;
  initials?: string;
}

export interface KanbanCardProps {
  title: string;
  subtitle?: string;
  value?: string | number;
  valuePrefix?: string;
  dotColor?: string;
  className?: string;
  badge?: { label: string; color?: string };
  assignee?: KanbanCardAssignee;
  metadata?: KanbanCardMetadata[];
  editable?: { onClick: () => void };
  deletable?: { onClick: () => void };
  actions?: KanbanCardAction[];
  isDropped?: boolean;
  dragOverlay?: boolean;
  onClick?: () => void;
}

export function KanbanCard({
  title,
  subtitle,
  value,
  valuePrefix,
  dotColor,
  className = '',
  badge,
  assignee,
  metadata = [],
  editable,
  deletable,
  actions = [],
  isDropped = false,
  dragOverlay = false,
  onClick,
}: KanbanCardProps) {
  const hasActions = editable || deletable || (actions && actions.length > 0);

  const combinedActions: KanbanCardAction[] = [];
  if (editable) {
    combinedActions.push({
      icon: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
        </svg>
      ),
      label: 'Editar',
      onClick: editable.onClick,
    });
  }
  if (deletable) {
    combinedActions.push({
      icon: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="3 6 5 6 21 6" />
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
        </svg>
      ),
      label: 'Eliminar',
      onClick: deletable.onClick,
      variant: 'danger',
    });
  }
  if (actions && actions.length > 0) {
    combinedActions.push(...actions.filter((a) => a.show !== false));
  }

  const shellClasses = [
    'kanban-card-shell',
    isDropped ? 'kanban-card-drop' : '',
    dragOverlay ? 'kanban-card-overlay' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={shellClasses} onClick={onClick}>
      <div className="kanban-card-accent" />
      <div className="kanban-card-core">
        {/* Header */}
        <div className="kanban-card-header">
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 'var(--spacing-2)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-2)', minWidth: 0 }}>
              {dotColor && (
                <span className="kanban-card-dot" style={{ background: dotColor }} />
              )}
              <div style={{ minWidth: 0 }}>
                <h4 className="kanban-card-title">{title}</h4>
                {subtitle && <p className="kanban-card-subtitle">{subtitle}</p>}
              </div>
            </div>
            {value !== undefined && (
              <div className="kanban-card-value" style={{ whiteSpace: 'nowrap', flexShrink: 0 }}>
                {valuePrefix ?? ''}{value}
              </div>
            )}
          </div>
        </div>

        {/* Badge */}
        {badge && (
          <span className="kanban-card-badge" style={{ background: badge.color || 'var(--sys-primary)' }}>
            {badge.label}
          </span>
        )}

        {/* Assignee */}
        {assignee && (
          <div className="kanban-card-assignee">
            {assignee.avatar ? (
              <img className="kanban-card-avatar" src={assignee.avatar} alt={assignee.name} />
            ) : (
              <div className="kanban-card-avatar">
                {assignee.initials ||
                  assignee.name
                    .split(' ')
                    .map((n) => n[0])
                    .join('')
                    .toUpperCase()
                    .slice(0, 2)}
              </div>
            )}
            <span className="kanban-card-assignee-name">{assignee.name}</span>
          </div>
        )}

        {/* Metadata */}
        {metadata.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-2)' }}>
            {metadata.map((line, idx) => (
              <div
                key={idx}
                className="kanban-card-metadata"
                style={{
                  fontWeight: line.weight || 'normal',
                  fontSize: line.size || '0.7rem',
                }}
              >
                {line.icon && <span className="kanban-card-metadata-icon">{line.icon}</span>}
                <span>{line.label}</span>
              </div>
            ))}
          </div>
        )}

        {/* Actions */}
        {hasActions && (
          <div className="kanban-card-actions">
            {combinedActions.map((action, ai) => (
              <button
                key={ai}
                className={`kanban-card-action-btn${action.variant === 'danger' ? ' kanban-card-action-btn-danger' : ''}`}
                title={action.label}
                onClick={(e) => {
                  e.stopPropagation();
                  action.onClick();
                }}
              >
                {action.icon}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default KanbanCard;
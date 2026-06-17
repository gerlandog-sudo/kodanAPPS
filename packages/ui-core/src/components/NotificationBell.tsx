import { Bell } from 'lucide-react';

interface NotificationBellProps {
  count?: number;
  onClick?: () => void;
}

export function NotificationBell({ count = 0, onClick }: NotificationBellProps) {
  return (
    <button className="notification-bell" onClick={onClick} aria-label="Notificaciones">
      <Bell size={18} />
      {count > 0 && (
        <span className="notification-badge">
          {count > 9 ? '9+' : count}
        </span>
      )}
    </button>
  );
}

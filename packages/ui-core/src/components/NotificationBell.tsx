import { Bell } from 'lucide-react';

interface NotificationBellProps {
  count?: number;
  onClick?: () => void;
}

export function NotificationBell({ count = 0, onClick }: NotificationBellProps) {
  return (
    <button className="relative inline-flex items-center justify-center w-9 h-9 rounded-md text-text-muted bg-transparent border-none cursor-pointer hover:text-text hover:bg-surface-hover transition-all" onClick={onClick} aria-label="Notificaciones">
      <Bell size={18} />
      {count > 0 && (
        <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold leading-none rounded-full bg-error text-on-error animate-[badge-pulse_2s_ease-in-out_infinite]">
          {count > 9 ? '9+' : count}
        </span>
      )}
    </button>
  );
}

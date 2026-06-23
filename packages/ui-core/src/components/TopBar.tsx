import { MessageSquare } from 'lucide-react';
import { DateTimeLive } from './DateTimeLive';
import { NotificationBell } from './NotificationBell';
import { UserMenu } from './UserMenu';
import type { UserMenuUser, UserMenuItem } from './UserMenu';

interface TopBarProps {
  title?: string;
  user: UserMenuUser | null;
  theme: 'light' | 'dark';
  onThemeToggle: () => void;
  onLogout: () => void;
  onChangePassword?: () => void;
  userMenuExtraItems?: UserMenuItem[];
  notificationCount?: number;
  onNotificationClick?: () => void;
  chatCount?: number;
  onChatClick?: () => void;
  children?: React.ReactNode;
}

export function TopBar({
  title,
  user,
  theme,
  onThemeToggle,
  onLogout,
  onChangePassword,
  userMenuExtraItems,
  notificationCount = 0,
  onNotificationClick,
  chatCount = 0,
  onChatClick,
  children,
}: TopBarProps) {
  return (
    <header className="sticky top-0 z-40 flex items-center justify-between h-16 px-6 bg-glass backdrop-blur-2xl border-b border-glass-border">
      <div className="flex items-center gap-4">
        <DateTimeLive />
      </div>

      {(title || children) && (
        <div className="flex items-center gap-4 flex-1 justify-center">
          {children}
        </div>
      )}

      <div className="flex items-center gap-4">
        {onChatClick && (
          <button
            className="relative inline-flex items-center justify-center w-9 h-9 rounded-md text-text-muted bg-transparent border-none cursor-pointer hover:text-text hover:bg-surface-hover transition-all"
            onClick={onChatClick}
            aria-label="Chat"
          >
            <MessageSquare size={18} />
            {chatCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold leading-none rounded-full bg-primary text-on-primary animate-[badge-pulse_2s_ease-in-out_infinite]">
                {chatCount > 9 ? '9+' : chatCount}
              </span>
            )}
          </button>
        )}
        <NotificationBell
          count={notificationCount}
          onClick={onNotificationClick}
        />
        <UserMenu
          user={user}
          theme={theme}
          onThemeToggle={onThemeToggle}
          onLogout={onLogout}
          onChangePassword={onChangePassword}
          extraItems={userMenuExtraItems}
        />
      </div>
    </header>
  );
}

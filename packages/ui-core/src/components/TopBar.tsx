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

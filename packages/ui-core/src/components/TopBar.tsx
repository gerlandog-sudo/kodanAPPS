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
    <header className="topbar">
      <div className="topbar-section">
        <DateTimeLive />
      </div>

      {(title || children) && (
        <div className="topbar-section" style={{ flex: 1, justifyContent: 'center' }}>
          {children}
        </div>
      )}

      <div className="topbar-section">
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

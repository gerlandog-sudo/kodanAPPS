import { Sun, Moon, ChevronRight, LogOut } from 'lucide-react';
import type { ReactNode } from 'react';

export interface NavItem {
  key: string;
  label: string;
  icon: ReactNode;
}

interface SidebarProps {
  title: string;
  navItems: NavItem[];
  activeKey: string;
  onNavigate: (key: string) => void;
  user: { display_name?: string; email?: string } | null;
  onLogout: () => void;
  /** Current theme — each app provides it from its own context */
  theme: 'light' | 'dark';
  onThemeToggle: () => void;
  logo?: string;
  logoIcon?: ReactNode;
  extraItems?: ReactNode;
  footerItems?: ReactNode;
  version?: string;
  headerClassName?: string;
  showUserSection?: boolean;
}

export function Sidebar({
  title,
  navItems,
  activeKey,
  onNavigate,
  user,
  onLogout,
  theme,
  onThemeToggle,
  logo,
  logoIcon,
  extraItems,
  footerItems,
  version = 'v1.0.0',
  headerClassName = '',
  showUserSection = true,
}: SidebarProps) {
  const linkBase = 'flex items-center gap-3 w-full px-3 py-2 rounded-md text-sm font-medium text-text-muted bg-transparent border-none cursor-pointer text-left hover:text-text hover:bg-surface-hover transition-all'
  const linkActive = 'text-primary bg-primary-container/15'
  return (
    <nav className="flex flex-col w-64 flex-shrink-0 h-screen sticky top-0 overflow-y-auto bg-surface-raised border-r border-border-soft">
      <div className="flex flex-col flex-1">
        <div className={`flex items-center justify-center gap-2.5 px-4 border-b border-border-soft ${headerClassName}`} style={{ height: 80, minHeight: 80 }}>
          {logoIcon || (logo && <img src={logo} alt="kodan" className="h-8 w-auto" />)}
          <span className="text-base font-bold tracking-tight text-text">{title}</span>
        </div>
        <div className="flex flex-col gap-1 px-3 py-6 flex-1">
          {navItems.map(item => (
            <button
              key={item.key}
              onClick={() => onNavigate(item.key)}
              className={`${linkBase} ${activeKey === item.key ? linkActive : ''}`}
            >
              {item.icon}
              <span>{item.label}</span>
              {activeKey === item.key && <ChevronRight size={14} className="ml-auto" />}
            </button>
          ))}
        </div>
      </div>

      {footerItems && (
        <div className="border-t border-border-soft px-3 py-2">
          {footerItems}
        </div>
      )}

      {showUserSection && (
        <div className="border-t border-border-soft">
          {user && (
            <div className="px-4 py-3 flex items-center gap-3 border-b border-border-soft">
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold bg-primary-container text-on-primary-container">
                {user.display_name?.charAt(0)?.toUpperCase() || '?'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate text-text">{user.display_name}</p>
                <p className="text-xs truncate text-text-muted">{user.email}</p>
              </div>
            </div>
          )}
          <div className="p-3 flex flex-col gap-1">
            {extraItems}
            <button onClick={onThemeToggle} className={`${linkBase} ${theme === 'dark' ? linkActive : ''}`}>
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
              <span>{theme === 'dark' ? 'Modo Claro' : 'Modo Oscuro'}</span>
            </button>
            <button onClick={onLogout} className={linkBase}>
              <LogOut size={18} />
              <span>Cerrar Sesion</span>
            </button>
            <div className="text-[10px] text-center pt-2 text-text-muted">
              {title} {version}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}

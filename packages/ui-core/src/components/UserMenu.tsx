import { useState, useRef, useEffect } from 'react';
import { Sun, Moon, LogOut, Lock, ChevronDown } from 'lucide-react';
import type { ReactNode } from 'react';

export interface UserMenuItem {
  label: string;
  icon: ReactNode;
  onClick: () => void;
  danger?: boolean;
  dividerBefore?: boolean;
}

export interface UserMenuUser {
  display_name?: string;
  email?: string;
  avatar_url?: string | null;
}

interface UserMenuProps {
  user: UserMenuUser | null;
  theme: 'light' | 'dark';
  onThemeToggle: () => void;
  onLogout: () => void;
  onChangePassword?: () => void;
  extraItems?: UserMenuItem[];
}

export function UserMenu({ user, theme, onThemeToggle, onLogout, onChangePassword, extraItems }: UserMenuProps) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }

    function handleClickOutside(e: MouseEvent) {
      if (
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node) &&
        menuRef.current &&
        !menuRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const firstItem = menuRef.current?.querySelector('button');
    firstItem?.focus();
  }, [open]);

  if (!user) return null;

  const initial = user.display_name?.charAt(0)?.toUpperCase() || '?';
  const hasAvatar = !!user.avatar_url;

  return (
    <>
      <button
        ref={triggerRef}
        className="user-menu-trigger"
        onClick={() => setOpen((prev) => !prev)}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <span className="user-avatar">
          {hasAvatar ? (
            <img src={user.avatar_url!} alt={user.display_name || 'Avatar'} />
          ) : (
            <span style={{ color: '#fff' }}>{initial}</span>
          )}
        </span>
        <span className="user-name">{user.display_name}</span>
        <ChevronDown
          size={14}
          style={{
            color: 'var(--sys-text-muted)',
            transition: 'transform 150ms cubic-bezier(0.4, 0, 0.2, 1)',
            transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
          }}
        />
      </button>

      <div
        ref={menuRef}
        className={`dropdown-menu${open ? ' open' : ''}`}
        style={{
          position: 'fixed',
          top: 'calc(64px - 4px)',
          right: 'var(--spacing-6)',
        }}
        role="menu"
      >
        <div className="dropdown-header">
          <div className="dropdown-header-name">{user.display_name}</div>
          {user.email && <div className="dropdown-header-email">{user.email}</div>}
        </div>

        {extraItems?.map((item, i) => (
          <div key={i}>
            {item.dividerBefore && <hr className="dropdown-divider" />}
            <button
              className={`dropdown-item${item.danger ? ' danger' : ''}`}
              onClick={() => { item.onClick(); setOpen(false); }}
              role="menuitem"
            >
              {item.icon}
              {item.label}
            </button>
          </div>
        ))}

        {onChangePassword && (
          <div>
            {(extraItems && extraItems.length > 0) && <hr className="dropdown-divider" />}
            <button
              className="dropdown-item"
              onClick={() => { onChangePassword(); setOpen(false); }}
              role="menuitem"
            >
              <Lock size={16} />
              Cambiar Contrasena
            </button>
          </div>
        )}

        <hr className="dropdown-divider" />

        <button
          className="dropdown-item"
          onClick={() => { onThemeToggle(); setOpen(false); }}
          role="menuitem"
        >
          {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          {theme === 'dark' ? 'Modo Claro' : 'Modo Oscuro'}
        </button>

        <button
          className="dropdown-item danger"
          onClick={() => { onLogout(); setOpen(false); }}
          role="menuitem"
        >
          <LogOut size={16} />
          Cerrar Sesion
        </button>
      </div>
    </>
  );
}

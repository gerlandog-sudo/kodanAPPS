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

  const dropdownItem = 'flex items-center gap-3 w-full px-3 py-2 rounded-md text-[13px] font-medium text-text bg-transparent border-none cursor-pointer text-left hover:bg-surface-hover transition-all'
  const dropdownItemDanger = 'hover:bg-error-container hover:text-on-error-container'

  return (
    <>
      <button
        ref={triggerRef}
        className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-md bg-transparent border-none cursor-pointer text-text hover:bg-surface-hover transition-all"
        onClick={() => setOpen((prev) => !prev)}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <span className="w-8 h-8 rounded-full flex items-center justify-center text-[13px] font-semibold shrink-0 overflow-hidden bg-primary-container text-on-primary-container">
          {hasAvatar ? (
            <img src={user.avatar_url!} alt={user.display_name || 'Avatar'} />
          ) : (
            <span className="text-white">{initial}</span>
          )}
        </span>
        <span className="text-sm font-medium text-text whitespace-nowrap max-w-[120px] overflow-hidden text-ellipsis hidden md:inline">{user.display_name}</span>
        <ChevronDown
          size={14}
          className="text-text-muted transition-transform duration-150"
          style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}
        />
      </button>

      <div
        ref={menuRef}
        className={`min-w-[200px] p-1 bg-surface-raised border border-border-soft rounded-lg shadow-xl ${open ? 'opacity-100 scale-100 pointer-events-auto' : 'opacity-0 scale-95 pointer-events-none'} transition-all duration-150`}
        style={{
          position: 'fixed',
          top: 'calc(64px - 4px)',
          right: 'var(--spacing-6)',
          zIndex: 100,
        }}
        role="menu"
      >
        <div className="px-3 py-3 pb-2 border-b border-border-soft mb-1">
          <div className="text-sm font-semibold text-text">{user.display_name}</div>
          {user.email && <div className="text-xs text-text-muted mt-0.5">{user.email}</div>}
        </div>

        {extraItems?.map((item, i) => (
          <div key={i}>
            {item.dividerBefore && <hr className="h-px mx-2 my-1 bg-border-soft border-none" />}
            <button
              className={`${dropdownItem} ${item.danger ? dropdownItemDanger : ''}`}
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
            {(extraItems && extraItems.length > 0) && <hr className="h-px mx-2 my-1 bg-border-soft border-none" />}
            <button
              className={dropdownItem}
              onClick={() => { onChangePassword(); setOpen(false); }}
              role="menuitem"
            >
              <Lock size={16} />
              Cambiar Contrasena
            </button>
          </div>
        )}

        <hr className="h-px mx-2 my-1 bg-border-soft border-none" />

        <button
          className={dropdownItem}
          onClick={() => { onThemeToggle(); setOpen(false); }}
          role="menuitem"
        >
          {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          {theme === 'dark' ? 'Modo Claro' : 'Modo Oscuro'}
        </button>

        <button
          className={`${dropdownItem} ${dropdownItemDanger}`}
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

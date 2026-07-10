import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Sun, Moon, ChevronRight, ChevronDown, ChevronsLeft, ChevronsRight, LogOut } from 'lucide-react';

export interface NavItem {
  key: string;
  label: string;
  icon: ReactNode;
  /** Nivel 2 (anidación). Opcional y retrocompatible. */
  children?: NavItem[];
  /** Contador opcional mostrado a la derecha (o como punto en modo icono). */
  badge?: number | string;
  disabled?: boolean;
}

interface SidebarProps {
  title: string;
  navItems: NavItem[];
  activeKey: string;
  onNavigate: (key: string) => void;
  user?: { display_name?: string; email?: string } | null;
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
  /** Ancho inicial (px) cuando está expandido. */
  defaultWidth?: number;
  /** Ancho del riel de solo-iconos (colapso total). */
  collapsedWidth?: number;
  /** Ancho mínimo expandido: al soltar por debajo del umbral, hace snap a este valor. */
  minWidth?: number;
  /** Ancho máximo al que se puede redimensionar. */
  maxWidth?: number;
  /** Por debajo de este ancho (px) se ocultan los textos (modo icono inteligente). */
  iconOnlyThreshold?: number;
  /** Inicia colapsado. */
  defaultCollapsed?: boolean;
  /** Persistir ancho en localStorage. */
  persist?: boolean;
  /** Clave de localStorage (por defecto derivada del title). */
  storageKey?: string;
  onCollapseChange?: (collapsed: boolean) => void;
}

interface SidebarContextValue {
  /** true cuando el sidebar está en modo solo-iconos. */
  compact: boolean;
}

export const SidebarContext = createContext<SidebarContextValue>({ compact: false });

export function useSidebar(): SidebarContextValue {
  return useContext(SidebarContext);
}

const STORAGE_PREFIX = 'kodan-sidebar:';

function findParentKey(items: NavItem[], key: string, parent: string | null = null): string | null {
  for (const it of items) {
    if (it.key === key) return parent;
    if (it.children?.length) {
      const r = findParentKey(it.children, key, it.key);
      if (r !== null) return r;
    }
  }
  return null;
}

function sanitizeKey(title: string): string {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

function badgeText(b: number | string): string {
  if (typeof b === 'number') return b > 99 ? '99+' : String(b);
  return b;
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
  defaultWidth = 256,
  collapsedWidth = 64,
  minWidth = 180,
  maxWidth = 360,
  iconOnlyThreshold = 140,
  defaultCollapsed = false,
  persist = true,
  storageKey,
  onCollapseChange,
}: SidebarProps) {
  const storageKeyValue = storageKey ?? `${STORAGE_PREFIX}${sanitizeKey(title)}`;

  const [width, setWidth] = useState<number>(() => {
    if (defaultCollapsed) return collapsedWidth;
    if (!persist) return defaultWidth;
    try {
      const raw = localStorage.getItem(storageKeyValue);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (typeof parsed.width === 'number') {
          return Math.max(collapsedWidth, Math.min(maxWidth, parsed.width));
        }
      }
    } catch {
      /* ignore corrupted storage */
    }
    return defaultWidth;
  });

  const [isDragging, setIsDragging] = useState(false);
  const [expandedKey, setExpandedKey] = useState<string | null>(() => findParentKey(navItems, activeKey));
  const [flyout, setFlyout] = useState<{ key: string; top: number; left: number } | null>(null);

  const navRef = useRef<HTMLElement>(null);
  const handleRef = useRef<HTMLDivElement>(null);
  const dragStart = useRef<{ x: number; w: number } | null>(null);
  const lastExpandedWidth = useRef<number>(defaultWidth);
  const closeTimer = useRef<number | null>(null);

  const isIconOnly = width <= iconOnlyThreshold;

  const reduceMotion =
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  // Persistir ancho
  useEffect(() => {
    if (!persist) return;
    try {
      localStorage.setItem(storageKeyValue, JSON.stringify({ width }));
    } catch {
      /* ignore */
    }
  }, [width, storageKeyValue, persist]);

  // Mantener expandido el grupo activo
  useEffect(() => {
    const parent = findParentKey(navItems, activeKey);
    if (parent && expandedKey !== parent) setExpandedKey(parent);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeKey, navItems]);

  // Notificar cambios de colapso
  useEffect(() => {
    onCollapseChange?.(isIconOnly);
  }, [isIconOnly, onCollapseChange]);

  const handlePointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    handleRef.current?.setPointerCapture(e.pointerId);
    dragStart.current = { x: e.clientX, w: navRef.current?.offsetWidth ?? width };
    setIsDragging(true);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragStart.current) return;
    const dx = e.clientX - dragStart.current.x;
    let next = dragStart.current.w + dx;
    next = Math.max(collapsedWidth, Math.min(maxWidth, next));
    setWidth(next);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!dragStart.current) return;
    handleRef.current?.releasePointerCapture(e.pointerId);
    dragStart.current = null;
    setIsDragging(false);
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
    // Snap inteligente al soltar
    setWidth((w) => {
      if (w <= iconOnlyThreshold) return collapsedWidth;
      if (w < minWidth) return minWidth;
      return w;
    });
  };

  const toggleCollapse = () => {
    if (isIconOnly) {
      setWidth(lastExpandedWidth.current || defaultWidth);
    } else {
      lastExpandedWidth.current = width;
      setWidth(collapsedWidth);
    }
  };

  const openFlyout = (item: NavItem, btn: HTMLElement) => {
    if (closeTimer.current) {
      window.clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
    const rect = btn.getBoundingClientRect();
    setFlyout({ key: item.key, top: rect.top, left: rect.right + 8 });
  };

  const scheduleCloseFlyout = () => {
    if (closeTimer.current) window.clearTimeout(closeTimer.current);
    closeTimer.current = window.setTimeout(() => setFlyout(null), 120);
  };

  const cancelCloseFlyout = () => {
    if (closeTimer.current) {
      window.clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  };

  const linkBase =
    'flex items-center gap-3 w-full px-3 py-2 rounded-md text-sm font-medium text-text-muted bg-transparent border-none cursor-pointer text-left hover:text-text hover:bg-surface-hover transition-all';
  const linkActive = 'text-primary bg-primary-container/15';

  const renderItem = (item: NavItem, isChild = false) => {
    const hasChildren = !!item.children?.length;
    const isActive = activeKey === item.key || (hasChildren && item.children!.some((c) => c.key === activeKey));
    const expanded = expandedKey === item.key;
    const disabledCls = item.disabled ? 'opacity-50 cursor-not-allowed' : '';

    if (hasChildren) {
      return (
        <div key={item.key} className="flex flex-col">
          <button
            type="button"
            disabled={item.disabled}
            title={isIconOnly ? item.label : undefined}
            onClick={() => {
              onNavigate(item.key);
              if (!isIconOnly) setExpandedKey(expanded ? null : item.key);
            }}
            onMouseEnter={(e) => isIconOnly && openFlyout(item, e.currentTarget)}
            onMouseLeave={() => isIconOnly && scheduleCloseFlyout()}
            onFocus={(e) => isIconOnly && openFlyout(item, e.currentTarget)}
            onBlur={() => isIconOnly && scheduleCloseFlyout()}
            className={`${linkBase} ${isIconOnly ? 'justify-center' : ''} ${isActive ? linkActive : ''} ${disabledCls}`}
            style={{ paddingLeft: isChild && !isIconOnly ? '2.25rem' : undefined }}
          >
            <span className="relative flex items-center justify-center">
              {item.icon}
              {item.badge != null && isIconOnly && (
                <span className="absolute -top-1.5 -right-1.5 min-w-[14px] h-[14px] px-1 flex items-center justify-center text-[9px] font-bold rounded-full bg-primary text-on-primary">
                  {badgeText(item.badge)}
                </span>
              )}
            </span>
            {!isIconOnly && <span className="truncate">{item.label}</span>}
            {!isIconOnly && (
              <span className="ml-auto flex items-center gap-1">
                {item.badge != null && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-primary-container text-on-primary-container">
                    {badgeText(item.badge)}
                  </span>
                )}
                <ChevronDown size={14} className={`transition-transform ${expanded ? 'rotate-180' : ''}`} />
              </span>
            )}
          </button>
          {!isIconOnly && expanded && (
            <div className="flex flex-col gap-1 mt-1">
              {item.children!.map((child) => renderItem(child, true))}
            </div>
          )}
        </div>
      );
    }

    return (
      <button
        key={item.key}
        type="button"
        disabled={item.disabled}
        title={isIconOnly ? item.label : undefined}
        onClick={() => onNavigate(item.key)}
        className={`${linkBase} ${isIconOnly ? 'justify-center' : ''} ${isActive ? linkActive : ''} ${disabledCls}`}
        style={{ paddingLeft: isChild && !isIconOnly ? '2.25rem' : undefined }}
      >
        <span className="relative flex items-center justify-center">
          {item.icon}
          {item.badge != null && isIconOnly && (
            <span className="absolute -top-1.5 -right-1.5 min-w-[14px] h-[14px] px-1 flex items-center justify-center text-[9px] font-bold rounded-full bg-primary text-on-primary">
              {badgeText(item.badge)}
            </span>
          )}
        </span>
        {!isIconOnly && <span className="truncate">{item.label}</span>}
        {!isIconOnly &&
          (item.badge != null ? (
            <span className="ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-primary-container text-on-primary-container">
              {badgeText(item.badge)}
            </span>
          ) : (
            isActive && <ChevronRight size={14} className="ml-auto" />
          ))}
      </button>
    );
  };

  const flyoutParent = flyout ? navItems.find((i) => i.key === flyout.key) : undefined;

  return (
    <SidebarContext.Provider value={{ compact: isIconOnly }}>
      <nav
        ref={navRef}
        className="relative flex flex-col h-screen sticky top-0 overflow-y-auto bg-surface-raised border-r border-border-soft"
        style={{
          width: isDragging ? width : isIconOnly ? collapsedWidth : width,
          transition: isDragging || reduceMotion ? 'none' : 'width 200ms cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      >
        <div className="flex flex-col flex-1">
          <div
            className={`flex items-center gap-2.5 px-4 border-b border-border-soft ${headerClassName}`}
            style={{ height: 80, minHeight: 80, justifyContent: isIconOnly ? 'center' : 'flex-start' }}
          >
            {logoIcon || (logo && <img src={logo} alt="kodan" className="h-8 w-auto" />)}
            {!isIconOnly && <span className="text-base font-bold tracking-tight text-text truncate">{title}</span>}
          </div>

          <div className="flex flex-col gap-1 px-3 py-6 flex-1">
            {navItems.map((item) => renderItem(item))}
          </div>
        </div>

        {footerItems && <div className="border-t border-border-soft px-3 py-2">{footerItems}</div>}

        {showUserSection && (
          <div className="border-t border-border-soft">
            {user && (
              <div
                className={`px-4 py-3 flex items-center gap-3 border-b border-border-soft ${isIconOnly ? 'justify-center' : ''}`}
              >
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold bg-primary-container text-on-primary-container flex-shrink-0">
                  {user.display_name?.charAt(0)?.toUpperCase() || '?'}
                </div>
                {!isIconOnly && (
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate text-text">{user.display_name}</p>
                    <p className="text-xs truncate text-text-muted">{user.email}</p>
                  </div>
                )}
              </div>
            )}
            <div className="p-3 flex flex-col gap-1">
              {extraItems}
              <button
                type="button"
                onClick={onThemeToggle}
                title={isIconOnly ? (theme === 'dark' ? 'Modo Claro' : 'Modo Oscuro') : undefined}
                className={`${linkBase} ${isIconOnly ? 'justify-center' : ''} ${theme === 'dark' ? linkActive : ''}`}
              >
                {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
                {!isIconOnly && <span>{theme === 'dark' ? 'Modo Claro' : 'Modo Oscuro'}</span>}
              </button>
              <button
                type="button"
                onClick={onLogout}
                title={isIconOnly ? 'Cerrar Sesion' : undefined}
                className={`${linkBase} ${isIconOnly ? 'justify-center' : ''}`}
              >
                <LogOut size={18} />
                {!isIconOnly && <span>Cerrar Sesion</span>}
              </button>
              {!isIconOnly && (
                <div className="text-[10px] text-center pt-2 text-text-muted">
                  {title} {version}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Handle de redimensionado por drag & drop + botón de colapso flotante */}
        <div
          ref={handleRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          role="separator"
          aria-orientation="vertical"
          aria-label="Redimensionar barra lateral"
          className="absolute top-0 right-0 h-full w-3 cursor-col-resize z-30 group touch-none select-none"
          style={{ touchAction: 'none' }}
        >
          {/* Línea visual del borde, centrada en el riel de drag */}
          <div className="absolute left-1/2 -translate-x-1/2 top-0 h-full w-px bg-border-soft group-hover:bg-primary group-active:bg-primary transition-colors" />
          {/* Botón de colapso flotante, centrado sobre la línea de drag */}
          <button
            type="button"
            onClick={toggleCollapse}
            onPointerDown={(e) => e.stopPropagation()}
            title={isIconOnly ? 'Expandir' : 'Colapsar'}
            aria-label={isIconOnly ? 'Expandir barra lateral' : 'Colapsar barra lateral'}
            className="absolute left-1/2 -translate-x-1/2 top-7 flex items-center justify-center size-6 rounded-full border border-border-soft bg-surface-raised text-text-muted shadow-md hover:text-primary hover:border-primary transition-colors cursor-pointer z-40"
          >
            {isIconOnly ? <ChevronsRight size={14} /> : <ChevronsLeft size={14} />}
          </button>
        </div>
      </nav>

      {/* Submenú flotante en modo icono (portal para evitar recorte) */}
      {flyout && flyoutParent?.children?.length && createPortal(
        <div
          className="fixed z-50 min-w-[200px] rounded-lg border border-border-soft p-1.5 shadow-xl"
          style={{ top: flyout.top, left: flyout.left, background: 'var(--sys-surface-raised)' }}
          onMouseEnter={cancelCloseFlyout}
          onMouseLeave={scheduleCloseFlyout}
        >
          <p className="px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-text-muted">
            {flyoutParent.label}
          </p>
          {flyoutParent.children.map((child) => {
            const active = activeKey === child.key;
            return (
              <button
                key={child.key}
                type="button"
                disabled={child.disabled}
                onClick={() => {
                  onNavigate(child.key);
                  setFlyout(null);
                }}
                className={`flex items-center gap-2 w-full px-2 py-1.5 rounded-md text-sm text-left transition-all ${
                  active ? 'text-primary bg-primary-container/15' : 'text-text-muted hover:text-text hover:bg-surface-hover'
                } ${child.disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {child.icon}
                <span className="truncate">{child.label}</span>
                {child.badge != null && (
                  <span className="ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-primary-container text-on-primary-container">
                    {badgeText(child.badge)}
                  </span>
                )}
              </button>
            );
          })}
        </div>,
        document.body,
      )}
    </SidebarContext.Provider>
  );
}

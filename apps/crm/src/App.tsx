import { Toaster, Sidebar, Login, SetPassword, TopBar, useAuth, AuthLoading, QuotaUtilization, useSSE, MessageDrawer, SlidePanel } from '@kodan-apps/ui-core';
import type { NavItem } from '@kodan-apps/ui-core';
import { lazy, Suspense, useState, useEffect, useMemo, useCallback } from 'react';
import {
  LayoutDashboard,
  Building2,
  Users,
  Briefcase,
  Tag,
  ListTodo,
  FileText,
  Settings as SettingsIcon,
  User,
  BellRing,
  Clock,
  AlertCircle,
  UserCheck,
  Check,
  CheckCircle2,
  Trash2,
  ExternalLink,
} from 'lucide-react';
import type { UserMenuItem } from '@kodan-apps/ui-core';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { crmApi } from './api/client';
import './index.css';

const Dashboard = lazy(() => import('./pages/Dashboard').then(m => ({ default: m.Dashboard })));
const Negotiations = lazy(() => import('./pages/Negotiations').then(m => ({ default: m.Negotiations })));
const Accounts = lazy(() => import('./pages/Accounts').then(m => ({ default: m.Accounts })));
const Contacts = lazy(() => import('./pages/Contacts').then(m => ({ default: m.Contacts })));
const Products = lazy(() => import('./pages/Products').then(m => ({ default: m.Products })));
const Tasks = lazy(() => import('./pages/Tasks').then(m => ({ default: m.Tasks })));
const Settings = lazy(() => import('./pages/Settings').then(m => ({ default: m.Settings })));
const Quotes = lazy(() => import('./pages/Quotes').then(m => ({ default: m.Quotes })));
const QuotePrintView = lazy(() => import('./components/quotes/QuotePrintView').then(m => ({ default: m.QuotePrintView })));

const LogoCRM3D = lazy(() => import('./components/LogoCRM3D').then(m => ({ default: m.LogoCRM3D })));

function LogoCRM3DPlaceholder({ size }: { size?: number }) {
  return <div style={{ width: size ?? 48, height: size ?? 48 }} />;
}

type Route = 'dashboard' | 'negotiations' | 'accounts' | 'contacts' | 'products' | 'quotes' | 'tasks' | 'settings';
type View = 'login' | 'set-password' | 'app';

function AppContent() {
  const { theme, toggleTheme, loadUserTheme } = useTheme();
  const { logout: authLogout, setAuthenticated, loading, authenticated, user, roles, planStatus, planName } = useAuth('crm');
  const { messages: sseMessages, unreadCount, refetchUnreadCount } = useSSE(authenticated ? 'crm' : '');
  const [view, setView] = useState<View | 'initial'>('initial');
  const [route, setRoute] = useState<Route>('dashboard');

  // ── Print route detection (synchronous, no auth required) ──
  const printMatch = window.location.pathname.match(/\/quotes\/(\d+)\/print/)
  const printQuoteId = printMatch ? parseInt(printMatch[1], 10) : null
  const [chatOpen, setChatOpen] = useState(false);
  const [chatEntity, setChatEntity] = useState<{ type: string; id: number; title?: string } | null>(null);

  // States for Smart Notifications
  const [notifications, setNotifications] = useState<any[]>([]);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [autoOpenOppId, setAutoOpenOppId] = useState<number | null>(null);

  const fetchNotifications = useCallback(async () => {
    if (!authenticated) return;
    try {
      const list = await crmApi.listNotifications();
      setNotifications(list || []);
    } catch (err) {
      console.error('Error fetching notifications:', err);
    }
  }, [authenticated]);

  useEffect(() => {
    if (authenticated) {
      fetchNotifications();
      const interval = setInterval(fetchNotifications, 45000);
      return () => clearInterval(interval);
    }
  }, [authenticated, fetchNotifications]);

  const unreadNotificationsCount = useMemo(() => {
    return notifications.filter((n: any) => n.is_read === 0).length;
  }, [notifications]);

  const handleMarkAllRead = async () => {
    try {
      await crmApi.markNotificationsRead();
      fetchNotifications();
    } catch (err) {
      console.error('Error marking all read:', err);
    }
  };

  const handleMarkRead = async (id: number) => {
    try {
      await crmApi.markNotificationsRead([id]);
      fetchNotifications();
    } catch (err) {
      console.error('Error marking read:', err);
    }
  };

  const handleClearAll = async () => {
    try {
      await crmApi.clearNotifications();
      setNotifications([]);
    } catch (err) {
      console.error('Error clearing notifications:', err);
    }
  };

  const handleNavigateToEntity = async (n: any) => {
    if (n.is_read === 0) {
      await handleMarkRead(n.id);
    }
    setNotificationsOpen(false);
    if (n.entity_type === 'crm_opportunity') {
      setAutoOpenOppId(n.entity_id);
      setRoute('negotiations');
    } else if (n.entity_type === 'crm_task') {
      setRoute('tasks');
    }
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('token')) {
      setView('set-password');
    }
  }, []);

  useEffect(() => {
    if (view !== 'initial') return;
    if (loading) return;

    setView(authenticated ? 'app' : 'login');
    if (authenticated) {
      loadUserTheme();
    }
  }, [loading, authenticated, view, loadUserTheme]);

  const handleLogout = useCallback(() => {
    authLogout();
    setView('login');
  }, [authLogout]);

  useEffect(() => {
    const onForceLogout = () => handleLogout();
    window.addEventListener('auth:force-logout', onForceLogout);
    return () => window.removeEventListener('auth:force-logout', onForceLogout);
  }, [handleLogout]);

  const navItems = useMemo<NavItem[]>(() => {
    const items: NavItem[] = [
      { key: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={18} /> },
      { key: 'tasks', label: 'Tareas', icon: <ListTodo size={18} /> },
      { key: 'negotiations', label: 'Negociaciones', icon: <Briefcase size={18} /> },
      { key: 'quotes', label: 'Cotizaciones', icon: <FileText size={18} /> },
      { key: 'accounts', label: 'Cuentas B2B', icon: <Building2 size={18} /> },
      { key: 'contacts', label: 'Contactos', icon: <Users size={18} /> },
      { key: 'products', label: 'Catalogo', icon: <Tag size={18} /> },
    ]
    return items
  }, [roles])

  const userMenuExtraItems = useMemo<UserMenuItem[]>(() => [
    { label: 'Perfil', icon: <User size={16} />, onClick: () => {} },
    ...(roles.includes('admin') ? [{ label: 'Configuracion', icon: <SettingsIcon size={16} />, onClick: () => setRoute('settings' as Route) }] : []),
  ], [roles])

  // Print view — standalone, no sidebar/login
  if (printQuoteId) {
    return (
      <Suspense fallback={<AuthLoading />}>
        <QuotePrintView quoteId={printQuoteId} />
      </Suspense>
    )
  }

  if (view === 'initial' || loading) {
    return <AuthLoading />;
  }

  if (view === 'set-password') {
    return <SetPassword title="kodanCRM" emailPlaceholder="name@company.com" cardClassName="p-8 double-bevel-card" labelClassName="text-xs font-semibold" logoIcon={<Suspense fallback={<LogoCRM3DPlaceholder size={48} />}><LogoCRM3D size={48} theme={theme} /></Suspense>} onBackToLogin={() => setView('login')} />;
  }

  if (!authenticated) {
    return <Login appId="crm" title="kodanCRM" subtitle="Plataforma integrada de gestion de clientes y pipelines de ventas" cardClassName="p-8 double-bevel-card" labelClassName="text-xs font-semibold" logoIcon={<Suspense fallback={<LogoCRM3DPlaceholder size={48} />}><LogoCRM3D size={48} theme={theme} /></Suspense>} onLoginSuccess={(data) => { setAuthenticated(data); setView('app'); loadUserTheme(); }} onGoToSetPassword={() => setView('set-password')} />;
  }

  return (
    <div className="flex h-screen">
      <Sidebar
        title="kodanCRM"
        logoIcon={<Suspense fallback={<LogoCRM3DPlaceholder size={48} />}><LogoCRM3D size={48} theme={theme} /></Suspense>}
        navItems={navItems}
        activeKey={route}
        onNavigate={(key) => setRoute(key as Route)}
        user={user}
        onLogout={handleLogout}
        theme={theme}
        onThemeToggle={toggleTheme}
        headerClassName="animate-fade-in"
        showUserSection={false}
        footerItems={
          <QuotaUtilization
            planStatus={planStatus}
            planName={planName}
            onUpgrade={() => setRoute('settings')}
          />
        }
      />
      <div className="flex-1 flex flex-col min-w-0 min-h-0">
        <TopBar
          title="kodanCRM"
          user={user}
          theme={theme}
          onThemeToggle={toggleTheme}
          onLogout={handleLogout}
          userMenuExtraItems={userMenuExtraItems}
          notificationCount={unreadNotificationsCount}
          onNotificationClick={() => {
            setNotificationsOpen(true);
            fetchNotifications();
          }}
          chatCount={unreadCount}
          onChatClick={() => setChatOpen(true)}
        />
        <main className="flex flex-col flex-1 p-4 lg:p-6 min-w-0" style={{ background: 'var(--sys-bg)', overflow: 'hidden' }}>
          <div className="flex flex-col flex-1" style={{ overflow: 'hidden' }}>
            <Suspense fallback={
              <div className="flex items-center justify-center py-20">
                <div className="size-8 border-2 border-[var(--sys-primary)] border-t-transparent rounded-full animate-spin" />
              </div>
            }>
              {route === 'dashboard' && <Dashboard />}
              {route === 'negotiations' && (
                <Negotiations
                  autoOpenOppId={autoOpenOppId}
                  onClearAutoOpen={() => setAutoOpenOppId(null)}
                  onOpenChat={(type, id, title) => {
                    setChatEntity({ type, id, title });
                    setChatOpen(true);
                  }}
                  onNavigate={(r) => setRoute(r as Route)}
                />
              )}
              {route === 'accounts' && <Accounts />}
              {route === 'contacts' && <Contacts />}
              {route === 'products' && <Products />}
              {route === 'quotes' && <Quotes />}
              {route === 'tasks' && <Tasks />}
              {route === 'settings' && <Settings />}
            </Suspense>
          </div>
        </main>
      </div>

      <MessageDrawer
        isOpen={chatOpen}
        onClose={() => {
          setChatOpen(false);
          setChatEntity(null);
        }}
        entityType={chatEntity?.type ?? 'general'}
        entityId={chatEntity?.id ?? 0}
        currentUserId={user?.id ?? 0}
        sseMessages={sseMessages}
        title={chatEntity?.title}
        onMessagesRead={refetchUnreadCount}
      />

      <SlidePanel
        open={notificationsOpen}
        onClose={() => setNotificationsOpen(false)}
        title="Centro de Alertas & Notificaciones"
        width="34rem"
      >
        <div className="flex flex-col h-full" style={{ gap: '1rem' }}>
          <div className="flex justify-between items-center pb-3 border-b" style={{ borderColor: 'var(--sys-border-soft)' }}>
            <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--sys-text-muted)' }}>
              {notifications.length} notificaciones en total
            </span>
            <div className="flex gap-3">
              {unreadNotificationsCount > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  className="bg-transparent border-none flex items-center gap-1.5 text-xs py-1 px-2.5 font-medium cursor-pointer rounded-lg hover:bg-surface-hover transition-colors"
                  style={{ color: 'var(--sys-primary)' }}
                >
                  <CheckCircle2 size={14} /> Marcar todo leído
                </button>
              )}
              {notifications.length > 0 && (
                <button
                  onClick={handleClearAll}
                  className="bg-transparent border-none flex items-center gap-1.5 text-xs py-1 px-2.5 font-medium cursor-pointer rounded-lg text-red-500 hover:bg-red-50 transition-colors"
                >
                  <Trash2 size={14} /> Limpiar todo
                </button>
              )}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-3 min-h-0">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
                <div className="size-12 rounded-full flex items-center justify-center bg-[var(--sys-surface-muted)] text-[var(--sys-text-muted)]">
                  <BellRing size={20} className="opacity-50" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold m-0">No tienes alertas pendientes</h4>
                  <p className="text-xs text-[var(--sys-text-muted)] mt-1">El sistema está al día y bajo control.</p>
                </div>
              </div>
            ) : (
              notifications.map((n) => {
                const isUnread = n.is_read === 0;
                let borderLeftColor = 'var(--sys-border-soft)';
                let iconColor = 'var(--sys-text-muted)';
                let IconComponent = AlertCircle;

                if (n.type === 'overdue_close') {
                  borderLeftColor = 'var(--sys-error)';
                  iconColor = 'var(--sys-error)';
                  IconComponent = Clock;
                } else if (n.type === 'stalled_deal') {
                  borderLeftColor = 'var(--sys-warning)';
                  iconColor = 'var(--sys-warning)';
                  IconComponent = AlertCircle;
                } else if (n.type?.startsWith('new_assignment')) {
                  borderLeftColor = 'var(--sys-primary)';
                  iconColor = 'var(--sys-primary)';
                  IconComponent = UserCheck;
                }

                return (
                  <div
                    key={n.id}
                    className="p-4 rounded-xl border flex flex-col gap-3 transition-all relative"
                    style={{
                      background: isUnread ? 'var(--sys-surface-muted)' : 'var(--sys-surface)',
                      borderColor: 'var(--sys-border-soft)',
                      borderLeft: `4px solid ${borderLeftColor}`,
                      boxShadow: 'var(--sys-shadow-sm)',
                    }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <span style={{ color: iconColor }}>
                          <IconComponent size={16} />
                        </span>
                        <h4 className="text-sm font-semibold m-0">{n.title}</h4>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[10px] font-medium" style={{ color: 'var(--sys-text-muted)' }}>
                          {new Date(n.created_at).toLocaleDateString('es-AR', {
                            day: 'numeric',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                        {isUnread && (
                          <span
                            className="size-2 rounded-full shrink-0"
                            style={{ background: borderLeftColor }}
                          />
                        )}
                      </div>
                    </div>

                    <p className="text-xs m-0 leading-relaxed" style={{ color: 'var(--sys-text-muted)' }}>
                      {n.message}
                    </p>

                    <div className="flex items-center justify-end gap-2.5 pt-2 border-t" style={{ borderColor: 'var(--sys-border-soft)' }}>
                      {isUnread && (
                        <button
                          onClick={() => handleMarkRead(n.id)}
                          className="bg-transparent border-none py-1 px-2.5 text-xs font-semibold flex items-center gap-1 cursor-pointer rounded-lg hover:bg-surface-hover transition-colors"
                          style={{ color: 'var(--sys-primary)' }}
                        >
                          <Check size={13} /> Marcar como leída
                        </button>
                      )}
                      
                      {n.entity_type && n.entity_id && (
                        <button
                          onClick={() => handleNavigateToEntity(n)}
                          className="bg-primary text-on-primary border-none py-1 px-2.5 text-xs font-semibold flex items-center gap-1.5 cursor-pointer rounded-lg hover:bg-primary/90 transition-colors"
                        >
                          <ExternalLink size={12} />
                          {n.entity_type === 'crm_opportunity' ? 'Ver Negociación' : 'Ver Tarea'}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </SlidePanel>
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <Toaster />
      <AppContent />
    </ThemeProvider>
  );
}

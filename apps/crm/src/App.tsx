import { Toaster, Sidebar, Login, SetPassword, TopBar, useAuth, AuthLoading, QuotaUtilization, useSSE, MessageDrawer } from '@kodan-apps/ui-core';
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
} from 'lucide-react';
import type { UserMenuItem } from '@kodan-apps/ui-core';
import { ThemeProvider, useTheme } from './context/ThemeContext';
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
      { key: 'negotiations', label: 'Negociaciones', icon: <Briefcase size={18} /> },
      { key: 'accounts', label: 'Cuentas B2B', icon: <Building2 size={18} /> },
      { key: 'contacts', label: 'Contactos', icon: <Users size={18} /> },
      { key: 'products', label: 'Catalogo', icon: <Tag size={18} /> },
      { key: 'quotes', label: 'Cotizaciones', icon: <FileText size={18} /> },
      { key: 'tasks', label: 'Agenda', icon: <ListTodo size={18} /> },
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
          notificationCount={unreadCount}
          onNotificationClick={() => {
            setChatEntity({ type: 'general', id: 0, title: 'Mensajería General' });
            setChatOpen(true);
          }}
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

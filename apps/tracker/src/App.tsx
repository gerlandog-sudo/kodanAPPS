import { ThemeProvider, useTheme, Toaster, Login, SetPassword, Sidebar, TopBar, QuotaUtilization, useSSE, MessageDrawer, useAuth, AuthLoading } from '@kodan-apps/ui-core';
import type { NavItem, UserMenuItem } from '@kodan-apps/ui-core';
import { lazy, Suspense, useState, useEffect, useMemo, useCallback } from 'react';
import { B2BAccountNavItem, B2BContactNavItem } from '@kodan-apps/shared';
import { LayoutDashboard } from 'lucide-react';
import './index.css';

const Dashboard = lazy(() => import('./pages/Dashboard').then(m => ({ default: m.Dashboard })));
const Accounts = lazy(() => import('./pages/Accounts').then(m => ({ default: m.Accounts })));
const Contacts = lazy(() => import('./pages/Contacts').then(m => ({ default: m.Contacts })));
const LogoTRACKER3D = lazy(() => import('./components/LogoTRACKER3D').then(m => ({ default: m.LogoTRACKER3D })));

function Logo3DPlaceholder({ size }: { size?: number }) {
  return <div className="shrink-0 animate-pulse bg-slate-200 rounded-full" style={{ width: size ?? 48, height: size ?? 48 }} />;
}

type View = 'login' | 'set-password' | 'app';
type Route = 'dashboard' | 'accounts' | 'contacts';

function AppContent() {
  const { theme, toggleTheme } = useTheme();
  const [view, setView] = useState<View | 'initial'>('initial');
  const [route, setRoute] = useState<Route>('dashboard');
  const [chatOpen, setChatOpen] = useState(false);

  const {
    logout: authLogout,
    setAuthenticated,
    loading,
    authenticated,
    user,
    planStatus,
    planName,
  } = useAuth('tracker');

  const { messages: sseMessages, unreadCount, refetchUnreadCount } = useSSE(authenticated ? 'tracker' : '');

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
  }, [loading, authenticated, view]);

  const handleLoginSuccess = useCallback((userData: any) => {
    setAuthenticated(userData);
    setView('app');
  }, [setAuthenticated]);

  const handleLogout = useCallback(() => {
    authLogout();
    setView('login');
  }, [authLogout]);

  useEffect(() => {
    const onForceLogout = () => handleLogout();
    window.addEventListener('auth:force-logout', onForceLogout);
    return () => window.removeEventListener('auth:force-logout', onForceLogout);
  }, [handleLogout]);

  const navItems = useMemo<NavItem[]>(() => [
    { key: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={18} /> },
    B2BAccountNavItem,
    B2BContactNavItem,
  ], []);

  const userMenuExtraItems = useMemo<UserMenuItem[]>(() => [], []);

  if (view === 'initial' || loading) {
    return <AuthLoading />;
  }

  if (view === 'set-password') {
    return (
      <SetPassword
        title="kodanTRACKER"
        cardClassName="p-8 double-bevel-card"
        labelClassName="text-xs font-semibold"
        logoIcon={<Suspense fallback={<Logo3DPlaceholder size={48} />}><LogoTRACKER3D size={48} theme={theme} /></Suspense>}
        onBackToLogin={() => setView('login')}
      />
    );
  }

  if (!authenticated) {
    return (
      <Login
        appId="tracker"
        title="kodanTRACKER"
        subtitle="Gestion de proyectos"
        cardClassName="p-8 double-bevel-card"
        labelClassName="text-xs font-semibold"
        logoIcon={<Suspense fallback={<Logo3DPlaceholder size={48} />}><LogoTRACKER3D size={48} theme={theme} /></Suspense>}
        onLoginSuccess={handleLoginSuccess}
        onGoToSetPassword={() => setView('set-password')}
      />
    );
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar
        title="kodanTRACKER"
        logoIcon={<Suspense fallback={<Logo3DPlaceholder size={48} />}><LogoTRACKER3D size={48} theme={theme} /></Suspense>}
        navItems={navItems}
        activeKey={route}
        onNavigate={(key) => setRoute(key as Route)}
        user={user}
        onLogout={handleLogout}
        theme={theme}
        onThemeToggle={toggleTheme}
        showUserSection={false}
        footerItems={
          <QuotaUtilization
            planStatus={planStatus}
            planName={planName}
          />
        }
      />
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar
          title="kodanTRACKER"
          user={user}
          theme={theme}
          onThemeToggle={toggleTheme}
          onLogout={handleLogout}
          userMenuExtraItems={userMenuExtraItems}
          notificationCount={unreadCount}
          onNotificationClick={() => setChatOpen(true)}
        />
        <main className="flex-1 p-6 lg:p-10 min-w-0 overflow-x-hidden" style={{ background: 'var(--sys-bg)', minHeight: '100dvh' }}>
          <div className="mx-auto" style={{ maxWidth: '1400px' }}>
            <Suspense fallback={
              <div className="flex items-center justify-center py-20">
                <div className="size-8 border-2 border-[var(--sys-primary)] border-t-transparent rounded-full animate-spin" />
              </div>
            }>
              {route === 'dashboard' && <Dashboard />}
              {route === 'accounts' && <Accounts />}
              {route === 'contacts' && <Contacts />}
            </Suspense>
          </div>
        </main>
      </div>

      <MessageDrawer
        isOpen={chatOpen}
        onClose={() => setChatOpen(false)}
        entityType="general"
        entityId={0}
        currentUserId={user?.id ?? 0}
        sseMessages={sseMessages}
        title="Mensajería General"
        onMessagesRead={refetchUnreadCount}
      />
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider defaultTheme="dark">
      <Toaster />
      <AppContent />
    </ThemeProvider>
  );
}

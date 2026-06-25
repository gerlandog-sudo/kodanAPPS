import { ThemeProvider, useTheme } from './context/ThemeContext';
import { Toaster, Sidebar, Login, SetPassword, TopBar, useAuth, AuthLoading, QuotaUtilization, useSSE, MessageDrawer } from '@kodan-apps/ui-core';
import type { NavItem, UserMenuItem } from '@kodan-apps/ui-core';
import { SuperAdminDashboard } from './components/SuperAdminDashboard';
import { TenantManagement } from './components/TenantManagement';
import { PlanManagement } from './components/PlanManagement';
import { RoleManagement } from './components/RoleManagement';
import { ChangePassword } from './components/ChangePassword';
import { AppMetricsManager } from '@kodan-apps/ui-core';
import { superAdminApi } from './api/client';
import { useState, useEffect, useMemo, useCallback, lazy, Suspense } from 'react';
import {
  LayoutDashboard,
  Building2,
  CreditCard,
  FileSearch,
  Shield,
  User,
  Settings,
  Gauge,
} from 'lucide-react';
import { toast } from 'sonner';
import './index.css';

const LogoAdmin3D = lazy(() => import('./components/LogoAdmin3D').then(m => ({ default: m.LogoAdmin3D })));

function Logo3DPlaceholder({ size }: { size?: number }) {
  return <div style={{ width: size ?? 48, height: size ?? 48 }} />;
}

type Route = 'dashboard' | 'tenants' | 'plans' | 'roles' | 'audit' | 'app-metrics';
type View = 'login' | 'set-password' | 'app';


const navItems: NavItem[] = [
  { key: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={18} /> },
  { key: 'tenants', label: 'Tenants', icon: <Building2 size={18} /> },
  { key: 'plans', label: 'Planes', icon: <CreditCard size={18} /> },
  { key: 'app-metrics', label: 'Métricas', icon: <Gauge size={18} /> },
  { key: 'roles', label: 'Roles', icon: <Shield size={18} /> },
  { key: 'audit', label: 'Auditoria', icon: <FileSearch size={18} /> },
];

function AppMetricsManagerPage() {
  const [metrics, setMetrics] = useState<any[]>([]);
  const [apps, setApps] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadAll = async () => {
    try {
      setLoading(true);
      const [metricsData, appsData] = await Promise.all([
        superAdminApi.listAppMetrics() as Promise<any[]>,
        superAdminApi.listApps() as Promise<any[]>,
      ]);
      setMetrics(metricsData);
      setApps(appsData);
    } catch (err: any) {
      toast.error(err.message || 'Error cargando datos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadAll(); }, []);

  if (loading) {
    return <div className="flex items-center justify-center py-16"><div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" /></div>;
  }

  return (
    <AppMetricsManager
      apps={apps}
      metrics={metrics}
      onRefresh={loadAll}
      onCreateMetric={async (app, data) => {
        await superAdminApi.createAppMetric(app, data);
        await loadAll();
      }}
      onUpdateMetric={async (app, metric, data) => {
        await superAdminApi.updateAppMetric(app, metric, data);
        await loadAll();
      }}
      onDeleteMetric={async (app, metric) => {
        await superAdminApi.deleteAppMetric(app, metric);
        await loadAll();
      }}
      onCreateApp={async (data) => {
        await superAdminApi.createApp(data);
        await loadAll();
      }}
      onUpdateApp={async (appId, data) => {
        await superAdminApi.updateApp(appId, data);
        await loadAll();
      }}
      onDeleteApp={async (appId) => {
        await superAdminApi.deleteApp(appId);
        await loadAll();
      }}
    />
  );
}

function AppContent() {
  const [view, setView] = useState<View | 'initial'>('initial');
  const [route, setRoute] = useState<Route>('dashboard');
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const { loadUserTheme, theme, toggleTheme } = useTheme();
  const { logout: authLogout, setAuthenticated, loading, authenticated, user, planStatus, planName } = useAuth('superadmin');
  const { messages: sseMessages, unreadCount, refetchUnreadCount } = useSSE(authenticated ? 'superadmin' : '');

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

  const handleLoginSuccess = useCallback((data: any) => {
    setAuthenticated(data);
    setView('app');
    loadUserTheme();
  }, [setAuthenticated, loadUserTheme]);

  const handleLogout = useCallback(() => {
    authLogout();
    setView('login');
  }, [authLogout]);

  useEffect(() => {
    const onForceLogout = () => handleLogout();
    window.addEventListener('auth:force-logout', onForceLogout);
    return () => window.removeEventListener('auth:force-logout', onForceLogout);
  }, [handleLogout]);

  const userMenuExtraItems = useMemo<UserMenuItem[]>(() => [
    { label: 'Perfil', icon: <User size={16} />, onClick: () => {} },
    { label: 'Configuracion Global', icon: <Settings size={16} />, onClick: () => {} },
  ], []);

  if (view === 'initial' || loading) {
    return <AuthLoading />;
  }

  if (view === 'set-password') {
    return <SetPassword title="kodanAPPS" logoIcon={<Suspense fallback={<Logo3DPlaceholder size={48} />}><LogoAdmin3D size={48} theme={theme} /></Suspense>} onBackToLogin={() => setView('login')} />;
  }

  if (!authenticated) {
    return <Login appId="superadmin" title="kodanAPPS" logoIcon={<Suspense fallback={<Logo3DPlaceholder size={48} />}><LogoAdmin3D size={48} theme={theme} /></Suspense>} onLoginSuccess={handleLoginSuccess} onGoToSetPassword={() => setView('set-password')} />;
  }

  return (
    <div className="flex min-h-screen overflow-hidden">
      <Sidebar
        title="kodanAPPS"
        logoIcon={<Suspense fallback={<Logo3DPlaceholder size={48} />}><LogoAdmin3D size={48} theme={theme} /></Suspense>}
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
            onUpgrade={() => setRoute('plans')}
          />
        }
      />
      {showPasswordModal && <ChangePassword onClose={() => setShowPasswordModal(false)} />}
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar
          title="kodanAPPS"
          user={user}
          theme={theme}
          onThemeToggle={toggleTheme}
          onLogout={handleLogout}
          onChangePassword={() => setShowPasswordModal(true)}
          userMenuExtraItems={userMenuExtraItems}
          notificationCount={unreadCount}
          onNotificationClick={() => setChatOpen(true)}
        />
        <main className="flex-1 p-6 lg:p-10 min-w-0 overflow-hidden flex flex-col" style={{ background: 'var(--sys-bg)' }}>
          <div className="mx-auto flex-1 flex flex-col min-h-0" style={{ maxWidth: '1400px' }}>
            {route === 'dashboard' && <SuperAdminDashboard />}
            {route === 'tenants' && <TenantManagement />}
            {route === 'plans' && <PlanManagement />}
            {route === 'app-metrics' && <AppMetricsManagerPage />}
            {route === 'roles' && <RoleManagement />}
            {route === 'audit' && (
              <div className="flex items-center justify-center" style={{ minHeight: '60vh' }}>
                <div className="text-center">
                  <FileSearch size={48} className="mx-auto mb-4" style={{ color: 'var(--sys-text-muted)', opacity: 0.4 }} />
                  <p style={{ color: 'var(--sys-text-muted)' }}>Auditoria Global — Proximamente</p>
                </div>
              </div>
            )}
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
    <ThemeProvider>
      <Toaster />
      <AppContent />
    </ThemeProvider>
  );
}

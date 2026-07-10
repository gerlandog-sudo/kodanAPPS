import { ThemeProvider, useTheme, Toaster, Login, SetPassword, Sidebar, TopBar, QuotaUtilization, useSSE, MessageDrawer, useAuth, AuthLoading, ProfileModal } from '@kodan-apps/ui-core';
import type { NavItem, UserMenuItem } from '@kodan-apps/ui-core';
import { lazy, Suspense, useState, useEffect, useMemo, useCallback } from 'react';
import { B2BAccountNavItem, B2BContactNavItem } from '@kodan-apps/shared';
import { LayoutDashboard, FolderKanban, KanbanSquare, Clock, CheckCircle, Settings, TrendingUp, Thermometer, GitBranch, BrainCircuit, User } from 'lucide-react';
import './index.css';

const Dashboard = lazy(() => import('./pages/Dashboard').then(m => ({ default: m.Dashboard })));
const Accounts = lazy(() => import('./pages/Accounts').then(m => ({ default: m.Accounts })));
const Contacts = lazy(() => import('./pages/Contacts').then(m => ({ default: m.Contacts })));
const ProjectsPage = lazy(() => import('./pages/ProjectsPage').then(m => ({ default: m.ProjectsPage })));
const KanbanPage = lazy(() => import('./pages/KanbanPage').then(m => ({ default: m.KanbanPage })));
const TimeEntriesPage = lazy(() => import('./pages/TimeEntriesPage').then(m => ({ default: m.TimeEntriesPage })));
const ApprovalsPage = lazy(() => import('./pages/ApprovalsPage').then(m => ({ default: m.ApprovalsPage })));
const SettingsPage = lazy(() => import('./pages/SettingsPage').then(m => ({ default: m.SettingsPage })));
const MetricsPage = lazy(() => import('./pages/MetricsPage').then(m => ({ default: m.MetricsPage })));
const HeatmapPage = lazy(() => import('./pages/HeatmapPage').then(m => ({ default: m.HeatmapPage })));
const TimelinePage = lazy(() => import('./pages/TimelinePage').then(m => ({ default: m.TimelinePage })));
const PredictiveAlertsPage = lazy(() => import('./pages/PredictiveAlertsPage').then(m => ({ default: m.PredictiveAlertsPage })));
const LogoTRACKER3D = lazy(() => import('./components/LogoTRACKER3D').then(m => ({ default: m.LogoTRACKER3D })));

function Logo3DPlaceholder({ size }: { size?: number }) {
  return <div className="shrink-0 animate-pulse bg-slate-200 rounded-full" style={{ width: size ?? 48, height: size ?? 48 }} />;
}

type View = 'login' | 'set-password' | 'app';
type Route = 'dashboard' | 'projects' | 'kanban' | 'time-entries' | 'approvals' | 'accounts' | 'contacts' | 'settings' | 'metrics' | 'heatmap' | 'timeline' | 'ai-reports';

function AppContent() {
  const { theme, toggleTheme } = useTheme();
  const [view, setView] = useState<View | 'initial'>('initial');
  const [route, setRoute] = useState<Route>('dashboard');
  const [chatOpen, setChatOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const {
    logout: authLogout,
    setAuthenticated,
    loading,
    authenticated,
    user,
    roles = [],
    canApproveHours,
    planStatus,
    planName,
  } = useAuth('tracker');

  const { messages: sseMessages, unreadCount, refetchUnreadCount } = useSSE(authenticated ? 'tracker' : '');

  useEffect(() => {
    const handleNavigate = (e: Event) => {
      const customEv = e as CustomEvent<{ route: Route }>;
      if (customEv.detail && customEv.detail.route) {
        setRoute(customEv.detail.route);
      }
    };
    window.addEventListener('tracker:navigate', handleNavigate);
    return () => window.removeEventListener('tracker:navigate', handleNavigate);
  }, []);

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
    setRoute('dashboard');
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
      { key: 'metrics', label: 'Métricas', icon: <TrendingUp size={18} /> },
      { key: 'projects', label: 'Proyectos', icon: <FolderKanban size={18} /> },
      { key: 'kanban', label: 'Tablero Tareas', icon: <KanbanSquare size={18} /> },
      { key: 'time-entries', label: 'Horas', icon: <Clock size={18} /> },
    ];
    if (canApproveHours) {
      items.push({ key: 'approvals', label: 'Aprobaciones', icon: <CheckCircle size={18} /> });
    }
    items.push(
      { key: 'heatmap', label: 'Mapa de Calor', icon: <Thermometer size={18} /> },
      { key: 'timeline', label: 'Línea de Tiempo', icon: <GitBranch size={18} /> },
      { key: 'ai-reports', label: 'Reporte IA', icon: <BrainCircuit size={18} /> },
      { key: 'accounts', label: 'Cuentas', icon: B2BAccountNavItem.icon },
      { key: 'contacts', label: 'Contactos', icon: B2BContactNavItem.icon }
    );
    return items;
  }, [canApproveHours]);

  const userMenuExtraItems = useMemo<UserMenuItem[]>(() => {
    const items: UserMenuItem[] = [
      { label: 'Perfil', icon: <User size={16} />, onClick: () => setProfileOpen(true) },
    ];
    if (roles.includes('admin')) {
      items.push({ label: 'Configuración', icon: <Settings size={16} />, onClick: () => setRoute('settings') });
    }
    return items;
  }, [roles]);

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
    <div className="flex h-screen overflow-hidden">
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
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
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
        <main className="flex-1 p-6 lg:p-10 min-w-0 overflow-hidden flex flex-col" style={{ background: 'var(--sys-bg)' }}>
          <div className="mx-auto w-full h-full flex flex-col min-h-0" style={{ maxWidth: '1400px' }}>
            <Suspense fallback={
              <div className="flex items-center justify-center py-20">
                <div className="size-8 border-2 border-[var(--sys-primary)] border-t-transparent rounded-full animate-spin" />
              </div>
            }>
              {route === 'dashboard' && <Dashboard />}
              {route === 'projects' && <ProjectsPage />}
              {route === 'kanban' && <KanbanPage />}
              {route === 'time-entries' && <TimeEntriesPage />}
              {route === 'approvals' && <ApprovalsPage />}
              {route === 'metrics' && <MetricsPage />}
              {route === 'heatmap' && <HeatmapPage />}
              {route === 'timeline' && <TimelinePage />}
              {route === 'ai-reports' && <PredictiveAlertsPage />}
              {route === 'settings' && <SettingsPage />}
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

      <ProfileModal
        open={profileOpen}
        onClose={() => setProfileOpen(false)}
        user={user}
        appId="tracker"
        onProfileUpdated={(updated) => {
          if (user) {
            Object.assign(user, updated)
          }
        }}
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

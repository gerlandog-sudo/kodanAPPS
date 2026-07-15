import { ThemeProvider, useTheme, Toaster, Sidebar, Login, SetPassword, TopBar, useAuth, AuthLoading, ProfileModal } from '@kodan-apps/ui-core';
import type { NavItem, UserMenuItem } from '@kodan-apps/ui-core';
import { hubAdminApi } from './api/client';
import { Dashboard } from './pages/Dashboard';
import { AppsManagement } from './pages/AppsManagement';
import { CatalogManagement } from './pages/CatalogManagement';
import { ServicesManagement } from './pages/ServicesManagement';
import { Analytics } from './pages/Analytics';
import { useState, useEffect, useMemo, useCallback, lazy, Suspense } from 'react';
import {
  LayoutDashboard,
  Layers,
  Database,
  Cpu,
  BarChart3,
  Settings,
  User,
} from 'lucide-react';
import './index.css';

const LogoHub3D = lazy(() => import('./components/LogoHub3D').then(m => ({ default: m.LogoHub3D })));

function Logo3DPlaceholder({ size }: { size?: number }) {
  return <div style={{ width: size ?? 48, height: size ?? 48 }} />;
}

type Route = 'dashboard' | 'apps' | 'catalog' | 'services' | 'analytics';
type View = 'login' | 'set-password' | 'app';

const navItems: NavItem[] = [
  { key: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={18} /> },
  { key: 'apps', label: 'Aplicaciones', icon: <Layers size={18} /> },
  { key: 'catalog', label: 'Catálogo IA', icon: <Database size={18} /> },
  { key: 'services', label: 'Asignación IA', icon: <Cpu size={18} /> },
  { key: 'analytics', label: 'Estadísticas', icon: <BarChart3 size={18} /> },
];

function AppContent() {
  const [view, setView] = useState<View | 'initial'>('initial');
  const [route, setRoute] = useState<Route>('dashboard');
  const [profileOpen, setProfileOpen] = useState(false);
  const { loadUserTheme, theme, toggleTheme } = useTheme();
  const { logout: authLogout, setAuthenticated, loading, authenticated, user } = useAuth('hub');

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
    setRoute('dashboard');
    setView('login');
  }, [authLogout]);

  useEffect(() => {
    const onForceLogout = () => handleLogout();
    window.addEventListener('auth:force-logout', onForceLogout);
    return () => window.removeEventListener('auth:force-logout', onForceLogout);
  }, [handleLogout]);

  const userMenuExtraItems = useMemo<UserMenuItem[]>(() => [
    { label: 'Perfil', icon: <User size={16} />, onClick: () => setProfileOpen(true) },
    { label: 'Configuración', icon: <Settings size={16} />, onClick: () => {} },
  ], []);

  if (view === 'initial' || loading) {
    return <AuthLoading />;
  }

  if (view === 'set-password') {
    return (
      <SetPassword
        title="kodanHUB"
        logoIcon={<Suspense fallback={<Logo3DPlaceholder size={48} />}><LogoHub3D size={48} theme={theme} /></Suspense>}
        onBackToLogin={() => setView('login')}
      />
    );
  }

  if (!authenticated) {
    return (
      <Login
        appId="hub"
        title="kodanHUB"
        logoIcon={<Suspense fallback={<Logo3DPlaceholder size={48} />}><LogoHub3D size={48} theme={theme} /></Suspense>}
        onLoginSuccess={handleLoginSuccess}
        onGoToSetPassword={() => setView('set-password')}
      />
    );
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar
        title="kodanHUB"
        logoIcon={<Suspense fallback={<Logo3DPlaceholder size={48} />}><LogoHub3D size={48} theme={theme} /></Suspense>}
        navItems={navItems}
        activeKey={route}
        onNavigate={(key) => setRoute(key as Route)}
        user={user}
        onLogout={handleLogout}
        theme={theme}
        onThemeToggle={toggleTheme}
        showUserSection={false}
      />
      <ProfileModal
        open={profileOpen}
        onClose={() => setProfileOpen(false)}
        user={user}
        appId="hub"
        onProfileUpdated={(updated) => {
          if (user) Object.assign(user, updated);
        }}
      />
      <div className="flex-1 flex flex-col min-w-0 min-h-0">
        <TopBar
          title="kodanHUB"
          user={user}
          theme={theme}
          onThemeToggle={toggleTheme}
          onLogout={handleLogout}
          userMenuExtraItems={userMenuExtraItems}
        />
        <main className="flex-1 p-6 lg:p-10 min-w-0 min-h-0 overflow-hidden flex flex-col" style={{ background: 'var(--sys-bg)' }}>
          <div className="flex-1 flex flex-col min-h-0 w-full">
            {route === 'dashboard' && <Dashboard />}
            {route === 'apps' && <AppsManagement />}
            {route === 'catalog' && <CatalogManagement />}
            {route === 'services' && <ServicesManagement />}
            {route === 'analytics' && <Analytics />}
          </div>
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider apiClient={{ getTheme: () => hubAdminApi.getTheme(), updateTheme: async (t) => { await hubAdminApi.updateTheme(t); } }}>
      <Toaster />
      <AppContent />
    </ThemeProvider>
  );
}
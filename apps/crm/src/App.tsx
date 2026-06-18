import { Toaster, Sidebar, Login, SetPassword, TopBar, useAuth, AuthLoading } from '@kodan-apps/ui-core';
import type { NavItem } from '@kodan-apps/ui-core';
import { lazy, Suspense, useState, useEffect, useMemo, useCallback } from 'react';
import {
  LayoutDashboard,
  Building2,
  Users,
  Briefcase,
  Tag,
  ListTodo,
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

const Logo3D = lazy(() => import('./components/Logo3D').then(m => ({ default: m.Logo3D })));

function Logo3DPlaceholder({ size }: { size?: number }) {
  return <div style={{ width: size ?? 48, height: size ?? 48 }} />;
}

type Route = 'dashboard' | 'negotiations' | 'accounts' | 'contacts' | 'products' | 'tasks' | 'settings';
type View = 'login' | 'set-password' | 'app';

function AppContent() {
  const { theme, toggleTheme, loadUserTheme } = useTheme();
  const { logout: authLogout, setAuthenticated, loading, authenticated, user, roles } = useAuth('crm');
  const [view, setView] = useState<View | 'initial'>('initial');
  const [route, setRoute] = useState<Route>('dashboard');
  const [showNotifications, setShowNotifications] = useState(false);

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
      { key: 'tasks', label: 'Agenda', icon: <ListTodo size={18} /> },
    ]
    return items
  }, [roles])

  const userMenuExtraItems = useMemo<UserMenuItem[]>(() => [
    { label: 'Perfil', icon: <User size={16} />, onClick: () => {} },
    ...(roles.includes('admin') ? [{ label: 'Configuracion', icon: <SettingsIcon size={16} />, onClick: () => setRoute('settings' as Route) }] : []),
  ], [roles])

  if (view === 'initial' || loading) {
    return <AuthLoading />;
  }

  if (view === 'set-password') {
    return <SetPassword title="kodanCRM" emailPlaceholder="name@company.com" cardClassName="p-8 double-bevel-card" labelClassName="text-xs font-semibold" logoIcon={<Suspense fallback={<Logo3DPlaceholder size={48} />}><Logo3D size={48} theme={theme} /></Suspense>} onBackToLogin={() => setView('login')} />;
  }

  if (!authenticated) {
    return <Login appId="crm" title="kodanCRM" subtitle="Plataforma integrada de gestion de clientes y pipelines de ventas" cardClassName="p-8 double-bevel-card" labelClassName="text-xs font-semibold" logoIcon={<Suspense fallback={<Logo3DPlaceholder size={48} />}><Logo3D size={48} theme={theme} /></Suspense>} onLoginSuccess={(data) => { setAuthenticated(data); setView('app'); loadUserTheme(); }} onGoToSetPassword={() => setView('set-password')} />;
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar
        title="kodanCRM"
        logoIcon={<Suspense fallback={<Logo3DPlaceholder size={48} />}><Logo3D size={48} theme={theme} /></Suspense>}
        navItems={navItems}
        activeKey={route}
        onNavigate={(key) => setRoute(key as Route)}
        user={user}
        onLogout={handleLogout}
        theme={theme}
        onThemeToggle={toggleTheme}
        headerClassName="animate-fade-in"
        showUserSection={false}
      />
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar
          title="kodanCRM"
          user={user}
          theme={theme}
          onThemeToggle={toggleTheme}
          onLogout={handleLogout}
          userMenuExtraItems={userMenuExtraItems}
          notificationCount={showNotifications ? 3 : 0}
          onNotificationClick={() => setShowNotifications(!showNotifications)}
        />
        <main className="flex flex-col flex-1 p-6 lg:p-10 min-w-0 overflow-x-hidden" style={{ background: 'var(--sys-bg)' }}>
          <div className="flex flex-col flex-1 mx-auto" style={{ maxWidth: '1400px' }}>
            <Suspense fallback={
              <div className="flex items-center justify-center py-20">
                <div className="size-8 border-2 border-[var(--sys-primary)] border-t-transparent rounded-full animate-spin" />
              </div>
            }>
              {route === 'dashboard' && <Dashboard />}
              {route === 'negotiations' && <Negotiations />}
              {route === 'accounts' && <Accounts />}
              {route === 'contacts' && <Contacts />}
              {route === 'products' && <Products />}
              {route === 'tasks' && <Tasks />}
              {route === 'settings' && <Settings />}
            </Suspense>
          </div>
        </main>
      </div>
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

import { ThemeProvider, useTheme, Toaster, Sidebar, Login, SetPassword } from '@kodan-apps/ui-core';
import type { NavItem } from '@kodan-apps/ui-core';
import { lazy, Suspense, useState, useEffect, useCallback, useMemo } from 'react';
import {
  LayoutDashboard,
  Building2,
  Users,
  Briefcase,
  Tag,
  ListTodo,
  Settings as SettingsIcon,
} from 'lucide-react';
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
  const { theme, toggleTheme } = useTheme();
  const [view, setView] = useState<View>('login');
  const [route, setRoute] = useState<Route>('dashboard');
  const [user, setUser] = useState<any>(null);
  const [userRoles, setUserRoles] = useState<string[]>([]);

  useEffect(() => {
    const cachedUser = localStorage.getItem('crm_user');
    if (cachedUser) {
      try {
        const parsed = JSON.parse(cachedUser);
        setUser(parsed);
        setUserRoles(parsed.roles || []);
        setView('app');
      } catch {
        localStorage.removeItem('crm_user');
      }
    }

    const params = new URLSearchParams(window.location.search);
    if (params.get('token')) {
      setView('set-password');
    }
  }, []);

  const handleLoginSuccess = useCallback((userData: any) => {
    const roles = userData.roles || [];
    const data = { ...userData, roles };
    setUser(data);
    setUserRoles(roles);
    localStorage.setItem('crm_user', JSON.stringify(data));
    setView('app');
  }, []);

  const handleLogout = useCallback(() => {
    document.cookie = 'access_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    localStorage.removeItem('crm_user');
    setUser(null);
    setView('login');
  }, []);

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
      { key: 'products', label: 'Catálogo', icon: <Tag size={18} /> },
      { key: 'tasks', label: 'Agenda', icon: <ListTodo size={18} /> },
    ]
    if (userRoles.includes('admin')) {
      items.push({ key: 'settings', label: 'Configuración', icon: <SettingsIcon size={18} /> })
    }
    return items
  }, [userRoles])

  if (view === 'login') {
    return <Login appId="crm" title="kodanCRM" subtitle="Plataforma integrada de gestión de clientes y pipelines de ventas" cardClassName="p-8 double-bevel-card" labelClassName="text-xs font-semibold" logoIcon={<Suspense fallback={<Logo3DPlaceholder size={48} />}><Logo3D size={48} theme={theme} /></Suspense>} onLoginSuccess={handleLoginSuccess} onGoToSetPassword={() => setView('set-password')} />;
  }

  if (view === 'set-password') {
    return <SetPassword title="kodanCRM" emailPlaceholder="name@company.com" cardClassName="p-8 double-bevel-card" labelClassName="text-xs font-semibold" logoIcon={<Suspense fallback={<Logo3DPlaceholder size={48} />}><Logo3D size={48} theme={theme} /></Suspense>} onBackToLogin={() => setView('login')} />;
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
      />
      <main className="flex-1 p-6 lg:p-10 min-w-0 overflow-x-hidden" style={{ background: 'var(--sys-bg)', minHeight: '100dvh' }}>
        <div className="mx-auto" style={{ maxWidth: '1400px' }}>
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

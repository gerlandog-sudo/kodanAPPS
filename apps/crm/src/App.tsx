import { ThemeProvider, useTheme, Toaster, Sidebar } from '@kodan-apps/ui-core';
import type { NavItem } from '@kodan-apps/ui-core';
import { Dashboard } from './pages/Dashboard';
import { Negotiations } from './pages/Negotiations';
import { Accounts } from './pages/Accounts';
import { Contacts } from './pages/Contacts';
import { Products } from './pages/Products';

import { Tasks } from './pages/Tasks';
import { Settings } from './pages/Settings';
import { Login } from './components/Login';
import { SetPassword } from './components/SetPassword';
import { Logo3D } from './components/Logo3D';
import { useState, useEffect, useCallback, useMemo } from 'react';
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
    return <Login appId="crm" title="kodanCRM" subtitle="Plataforma integrada de gestión de clientes y pipelines de ventas" cardClassName="p-8 double-bevel-card" labelClassName="text-xs font-semibold" logoIcon={<Logo3D size={48} theme={theme} />} onLoginSuccess={handleLoginSuccess} onGoToSetPassword={() => setView('set-password')} />;
  }

  if (view === 'set-password') {
    return <SetPassword title="kodanCRM" emailPlaceholder="name@company.com" cardClassName="p-8 double-bevel-card" labelClassName="text-xs font-semibold" logoIcon={<Logo3D size={48} theme={theme} />} onBackToLogin={() => setView('login')} />;
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar
        title="kodanCRM"
        logoIcon={<Logo3D size={48} theme={theme} />}
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
          {route === 'dashboard' && <Dashboard />}
          {route === 'negotiations' && <Negotiations />}
          {route === 'accounts' && <Accounts />}
          {route === 'contacts' && <Contacts />}
          {route === 'products' && <Products />}
          {route === 'tasks' && <Tasks />}
          {route === 'settings' && <Settings />}
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

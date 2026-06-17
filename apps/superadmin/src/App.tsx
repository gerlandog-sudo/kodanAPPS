import { ThemeProvider, useTheme } from './context/ThemeContext';
import { Toaster, Sidebar, Login, SetPassword } from '@kodan-apps/ui-core';
import type { NavItem } from '@kodan-apps/ui-core';
import { SuperAdminDashboard } from './components/SuperAdminDashboard';
import { TenantManagement } from './components/TenantManagement';
import { PlanManagement } from './components/PlanManagement';
import { RoleManagement } from './components/RoleManagement';
import { ChangePassword } from './components/ChangePassword';
import { useState, useEffect, useCallback } from 'react';
import {
  LayoutDashboard,
  Building2,
  CreditCard,
  FileSearch,
  Shield,
  KeyRound,
} from 'lucide-react';
import './index.css';

type Route = 'dashboard' | 'tenants' | 'plans' | 'roles' | 'audit';
type View = 'login' | 'set-password' | 'app';

const navItems: NavItem[] = [
  { key: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={18} /> },
  { key: 'tenants', label: 'Tenants', icon: <Building2 size={18} /> },
  { key: 'plans', label: 'Planes', icon: <CreditCard size={18} /> },
  { key: 'roles', label: 'Roles', icon: <Shield size={18} /> },
  { key: 'audit', label: 'Auditoría', icon: <FileSearch size={18} /> },
];

function AppContent() {
  const [view, setView] = useState<View>('login');
  const [route, setRoute] = useState<Route>('dashboard');
  const [user, setUser] = useState<any>(null);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const { loadUserTheme, theme, toggleTheme } = useTheme();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('token')) {
      setView('set-password');
    }
  }, []);

  const handleLoginSuccess = useCallback(async (userData: any) => {
    setUser(userData);
    setView('app');
    await loadUserTheme();
  }, [loadUserTheme]);

  const handleLogout = useCallback(() => {
    document.cookie = 'access_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    setUser(null);
    setView('login');
  }, []);

  useEffect(() => {
    const onForceLogout = () => handleLogout();
    window.addEventListener('auth:force-logout', onForceLogout);
    return () => window.removeEventListener('auth:force-logout', onForceLogout);
  }, [handleLogout]);

  if (view === 'login') {
    return <Login appId="superadmin" title="kodanAPPS" onLoginSuccess={handleLoginSuccess} onGoToSetPassword={() => setView('set-password')} />;
  }

  if (view === 'set-password') {
    return <SetPassword onBackToLogin={() => setView('login')} />;
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar
        title="kodanAPPS"
        logo="/logo.png"
        navItems={navItems}
        activeKey={route}
        onNavigate={(key) => setRoute(key as Route)}
        user={user}
        onLogout={handleLogout}
        theme={theme}
        onThemeToggle={toggleTheme}
        extraItems={
          <button onClick={() => setShowPasswordModal(true)} className="sidebar-link">
            <KeyRound size={18} />
            <span>Cambiar Contraseña</span>
          </button>
        }
      />
      {showPasswordModal && <ChangePassword onClose={() => setShowPasswordModal(false)} />}
      <main className="flex-1 p-6 lg:p-10" style={{ background: 'var(--sys-bg)', minHeight: '100dvh' }}>
        <div className="mx-auto" style={{ maxWidth: '1400px' }}>
          {route === 'dashboard' && <SuperAdminDashboard />}
          {route === 'tenants' && <TenantManagement />}
          {route === 'plans' && <PlanManagement />}
          {route === 'roles' && <RoleManagement />}
          {route === 'audit' && (
            <div className="flex items-center justify-center" style={{ minHeight: '60vh' }}>
              <div className="text-center">
                <FileSearch size={48} className="mx-auto mb-4" style={{ color: 'var(--sys-text-muted)', opacity: 0.4 }} />
                <p style={{ color: 'var(--sys-text-muted)' }}>Auditoría Global — Próximamente</p>
              </div>
            </div>
          )}
        </div>
      </main>
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

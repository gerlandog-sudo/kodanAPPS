import { ThemeProvider, useTheme } from './context/ThemeContext';
import { Toaster, Sidebar, Login, SetPassword, TopBar, useAuth, AuthLoading } from '@kodan-apps/ui-core';
import type { NavItem, UserMenuItem } from '@kodan-apps/ui-core';
import { SuperAdminDashboard } from './components/SuperAdminDashboard';
import { TenantManagement } from './components/TenantManagement';
import { PlanManagement } from './components/PlanManagement';
import { RoleManagement } from './components/RoleManagement';
import { ChangePassword } from './components/ChangePassword';
import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  LayoutDashboard,
  Building2,
  CreditCard,
  FileSearch,
  Shield,
  User,
  Settings,
} from 'lucide-react';
import './index.css';

type Route = 'dashboard' | 'tenants' | 'plans' | 'roles' | 'audit';
type View = 'login' | 'set-password' | 'app';

const navItems: NavItem[] = [
  { key: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={18} /> },
  { key: 'tenants', label: 'Tenants', icon: <Building2 size={18} /> },
  { key: 'plans', label: 'Planes', icon: <CreditCard size={18} /> },
  { key: 'roles', label: 'Roles', icon: <Shield size={18} /> },
  { key: 'audit', label: 'Auditoria', icon: <FileSearch size={18} /> },
];

function AppContent() {
  const [view, setView] = useState<View | 'initial'>('initial');
  const [route, setRoute] = useState<Route>('dashboard');
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const { loadUserTheme, theme, toggleTheme } = useTheme();
  const { logout: authLogout, setAuthenticated, loading, authenticated, user } = useAuth('superadmin');

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
    return <SetPassword onBackToLogin={() => setView('login')} />;
  }

  if (!authenticated) {
    return <Login appId="superadmin" title="kodanAPPS" onLoginSuccess={handleLoginSuccess} onGoToSetPassword={() => setView('set-password')} />;
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
        showUserSection={false}
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
          notificationCount={5}
        />
        <main className="flex-1 p-6 lg:p-10 min-w-0 overflow-x-hidden" style={{ background: 'var(--sys-bg)', minHeight: '100dvh' }}>
          <div className="mx-auto" style={{ maxWidth: '1400px' }}>
            {route === 'dashboard' && <SuperAdminDashboard />}
            {route === 'tenants' && <TenantManagement />}
            {route === 'plans' && <PlanManagement />}
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

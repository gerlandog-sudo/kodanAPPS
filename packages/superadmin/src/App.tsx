import { ThemeProvider, useTheme } from './context/ThemeContext';
import { Toaster } from '@kodan-apps/ui-core';
import { SuperAdminDashboard } from './components/SuperAdminDashboard';
import { TenantManagement } from './components/TenantManagement';
import { PlanManagement } from './components/PlanManagement';
import { RoleManagement } from './components/RoleManagement';
import { Login } from './components/Login';
import { SetPassword } from './components/SetPassword';
import { ChangePassword } from './components/ChangePassword';
import { useState, useEffect, useCallback } from 'react';
import {
  LayoutDashboard,
  Building2,
  CreditCard,
  FileSearch,
  Shield,
  LogOut,
  Sun,
  Moon,
  ChevronRight,
  KeyRound,
} from 'lucide-react';
import './index.css';

type Route = 'dashboard' | 'tenants' | 'plans' | 'roles' | 'audit';
type View = 'login' | 'set-password' | 'app';

const navItems: { route: Route; label: string; icon: React.ReactNode }[] = [
  { route: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={18} /> },
  { route: 'tenants', label: 'Tenants', icon: <Building2 size={18} /> },
  { route: 'plans', label: 'Planes', icon: <CreditCard size={18} /> },
  { route: 'roles', label: 'Roles', icon: <Shield size={18} /> },
  { route: 'audit', label: 'Auditoría', icon: <FileSearch size={18} /> },
];

function Sidebar({
  active,
  onChange,
  onLogout,
  user,
}: {
  active: Route;
  onChange: (r: Route) => void;
  onLogout: () => void;
  user: any;
}) {
  const { theme, toggleTheme } = useTheme();
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  return (
    <>
      <nav className="flex flex-col justify-between w-64 flex-shrink-0 h-screen sticky top-0 overflow-y-auto" style={{ background: 'var(--sys-surface-raised)', borderRight: '1px solid var(--sys-border-soft)' }}>
        <div>
          <div className="flex items-center justify-center gap-2.5 py-6 px-4 border-b" style={{ borderColor: 'var(--sys-border-soft)' }}>
            <img src="/logo.png" alt="kodan" className="h-8 w-auto" />
            <span className="text-base font-bold tracking-tight" style={{ color: 'var(--sys-text)', fontFamily: 'var(--font-hanken)' }}>kodanAPPS</span>
          </div>
          <div className="flex flex-col gap-1 px-3 py-6">
            {navItems.map(item => (
              <button
                key={item.route}
                onClick={() => onChange(item.route)}
                className={`sidebar-link ${active === item.route ? 'active' : ''}`}
              >
                {item.icon}
                <span>{item.label}</span>
                {active === item.route && <ChevronRight size={14} className="ml-auto" />}
              </button>
            ))}
          </div>
        </div>

        <div className="border-t" style={{ borderColor: 'var(--sys-border-soft)' }}>
          {user && (
            <div className="px-4 py-3 flex items-center gap-3 border-b" style={{ borderColor: 'var(--sys-border-soft)' }}>
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold" style={{ background: 'var(--sys-primary-container)', color: 'var(--color-on-primary-container)' }}>
                {user.display_name?.charAt(0)?.toUpperCase() || 'S'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate" style={{ color: 'var(--sys-text)' }}>{user.display_name}</p>
                <p className="text-xs truncate" style={{ color: 'var(--sys-text-muted)' }}>{user.email}</p>
              </div>
            </div>
          )}
          <div className="p-3 flex flex-col gap-1">
            <button onClick={() => setShowPasswordModal(true)} className="sidebar-link">
              <KeyRound size={18} />
              <span>Cambiar Contraseña</span>
            </button>
            <button onClick={toggleTheme} className="sidebar-link">
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
              <span>{theme === 'dark' ? 'Modo Claro' : 'Modo Oscuro'}</span>
            </button>
            <button onClick={onLogout} className="sidebar-link">
              <LogOut size={18} />
              <span>Cerrar Sesión</span>
            </button>
            <div className="text-[10px] text-center pt-2" style={{ color: 'var(--sys-text-muted)' }}>
              kodanAPPS v1.0.0
            </div>
          </div>
        </div>
      </nav>
      {showPasswordModal && <ChangePassword onClose={() => setShowPasswordModal(false)} />}
    </>
  );
}

function AppContent() {
  const [view, setView] = useState<View>('login');
  const [route, setRoute] = useState<Route>('dashboard');
  const [user, setUser] = useState<any>(null);
  const { loadUserTheme } = useTheme();

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

  const handleLogout = () => {
    document.cookie = 'access_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    setUser(null);
    setView('login');
  };

  if (view === 'login') {
    return <Login onLoginSuccess={handleLoginSuccess} onGoToSetPassword={() => setView('set-password')} />;
  }

  if (view === 'set-password') {
    return <SetPassword onBackToLogin={() => setView('login')} />;
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar active={route} onChange={setRoute} onLogout={handleLogout} user={user} />
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

import { ThemeProvider } from './context/ThemeContext';
import { SuperAdminDashboard } from './components/SuperAdminDashboard';
import { TenantManagement } from './components/TenantManagement';
import { PlanManagement } from './components/PlanManagement';
import { Login } from './components/Login';
import { SetPassword } from './components/SetPassword';
import { useState, useEffect } from 'react';
import { Toaster } from 'sonner';
import './index.css';

/**
 * Super Admin App - Entry Point
 */

type Route = 'dashboard' | 'tenants' | 'plans' | 'audit';
type View = 'login' | 'set-password' | 'app';

function Navigation({ 
  active, 
  onChange, 
  onLogout, 
  user 
}: { 
  active: Route; 
  onChange: (r: Route) => void; 
  onLogout: () => void;
  user: any;
}) {
  const navItems: { route: Route; label: string; icon: string }[] = [
    { route: 'dashboard', label: 'Dashboard', icon: '📊' },
    { route: 'tenants', label: 'Tenants', icon: '🏢' },
    { route: 'plans', label: 'Planes', icon: '📋' },
    { route: 'audit', label: 'Auditoría', icon: '📜' },
  ];

  return (
    <nav className="sidebar flex flex-col justify-between" aria-label="Navegación principal">
      <div>
        <div className="p-4 border-b border-border">
          <h1 className="font-bold text-lg">kodanAPPS</h1>
          <p className="text-xs text-muted mt-1">Super Admin</p>
        </div>
        <ul className="flex flex-col gap-1 px-3 py-4" role="navigation">
          {navItems.map(item => (
            <li key={item.route}>
              <button
                role="tab"
                aria-selected={active === item.route}
                onClick={() => onChange(item.route)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${
                  active === item.route
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted hover:text-text hover:bg-surface'
                }`}
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
      <div>
        {user && (
          <div className="p-4 border-b border-t border-border">
            <p className="text-xs font-semibold truncate">{user.display_name}</p>
            <p className="text-[10px] text-muted truncate">{user.email}</p>
          </div>
        )}
        <div className="p-4 flex flex-col gap-2">
          <button onClick={onLogout} className="btn btn-secondary w-full text-xs py-1.5">
            Cerrar Sesión 🚪
          </button>
          <div className="text-[10px] text-muted text-center mt-1">
            kodanAPPS v1.0.0
          </div>
        </div>
      </div>
    </nav>
  );
}

function PageWrapper({ children, user }: { children: React.ReactNode; user: any }) {
  return (
    <div className="page flex-1">
      <header className="header">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-semibold">kodanAPPS Super Admin</h1>
        </div>
        <div className="flex items-center gap-4">
          {user && <span className="text-xs bg-sys-primary/10 text-sys-primary px-2.5 py-1 rounded-full font-medium">Conectado</span>}
        </div>
      </header>
      <main className="main container">
        {children}
      </main>
    </div>
  );
}

export default function App() {
  const [view, setView] = useState<View>('login');
  const [route, setRoute] = useState<Route>('dashboard');
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    // Detectar si venimos del link del seed
    const params = new URLSearchParams(window.location.search);
    if (params.get('token')) {
      setView('set-password');
    }
  }, []);

  const handleLoginSuccess = (userData: any) => {
    setUser(userData);
    setView('app');
  };

  const handleLogout = () => {
    // Expirar la cookie access_token en el cliente
    document.cookie = 'access_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    setUser(null);
    setView('login');
  };

  let content;
  if (view === 'login') {
    content = <Login onLoginSuccess={handleLoginSuccess} onGoToSetPassword={() => setView('set-password')} />;
  } else if (view === 'set-password') {
    content = <SetPassword onBackToLogin={() => setView('login')} />;
  } else {
    content = (
      <ThemeProvider>
        <div className="flex min-h-screen">
          <Navigation active={route} onChange={setRoute} onLogout={handleLogout} user={user} />
          <PageWrapper user={user}>
            {route === 'dashboard' && <SuperAdminDashboard />}
            {route === 'tenants' && <TenantManagement />}
            {route === 'plans' && <PlanManagement />}
            {route === 'audit' && (
              <div className="double-bevel-card p-8 text-center">
                <h2 className="text-xl font-semibold mb-2">Auditoría Global</h2>
                <p className="text-muted">Próximamente: logs de auditoría del sistema</p>
              </div>
            )}
          </PageWrapper>
        </div>
      </ThemeProvider>
    );
  }

  return (
    <>
      <Toaster richColors position="top-right" />
      {content}
    </>
  );
}
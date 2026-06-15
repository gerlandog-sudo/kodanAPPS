import { ThemeProvider } from './context/ThemeContext';
import { SuperAdminDashboard } from './components/SuperAdminDashboard';
import { TenantManagement } from './components/TenantManagement';
import { PlanManagement } from './components/PlanManagement';
import { useState } from 'react';
import './index.css';

/**
 * Super Admin App - Entry Point
 * 
 * Rutas:
 * - /          → Dashboard
 * - /tenants   → Gestión de Tenants
 * - /plans     → Planes y Límites
 * - /audit     → Auditoría (futuro)
 */

type Route = 'dashboard' | 'tenants' | 'plans' | 'audit';

function Navigation({ active, onChange }: { active: Route; onChange: (r: Route) => void }) {
  const navItems: { route: Route; label: string; icon: string }[] = [
    { route: 'dashboard', label: 'Dashboard', icon: '📊' },
    { route: 'tenants', label: 'Tenants', icon: '🏢' },
    { route: 'plans', label: 'Planes', icon: '📋' },
    { route: 'audit', label: 'Auditoría', icon: '📜' },
  ];

  return (
    <nav className="sidebar" aria-label="Navegación principal">
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
      <div className="p-4 border-t border-border text-xs text-muted">
        kodanAPPS v1.0.0
      </div>
    </nav>
  );
}

function PageWrapper({ children }: { children: React.ReactNode }) {
  return (
    <div className="page">
      <header className="header">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-semibold">kodanAPPS Super Admin</h1>
        </div>
        <div className="flex items-center gap-4">
          {/* User menu / notifications future */}
        </div>
      </header>
      <main className="main container">
        {children}
      </main>
    </div>
  );
}

export default function App() {
  const [route, setRoute] = useState<Route>('dashboard');

  return (
    <ThemeProvider>
      <div className="flex min-h-screen">
        <Navigation active={route} onChange={setRoute} />
        <PageWrapper>
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
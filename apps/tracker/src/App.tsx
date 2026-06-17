import { ThemeProvider, useTheme, Toaster, Login, SetPassword, Sidebar } from '@kodan-apps/ui-core';
import type { NavItem } from '@kodan-apps/ui-core';
import { lazy, Suspense, useState, useEffect, useCallback } from 'react';
import { FolderKanban } from 'lucide-react';
import './index.css';

const Dashboard = lazy(() => import('./pages/Dashboard').then(m => ({ default: m.Dashboard })));

type View = 'login' | 'set-password' | 'app';

function AppContent() {
  const { theme, toggleTheme } = useTheme();
  const [view, setView] = useState<View>('login');
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('token')) {
      setView('set-password');
    }
  }, []);

  const handleLoginSuccess = useCallback((userData: any) => {
    setUser(userData);
    setView('app');
  }, []);

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

  const navItems: NavItem[] = [
    { key: 'dashboard', label: 'Proyectos', icon: <FolderKanban size={18} /> },
  ];

  if (view === 'login') {
    return <Login appId="tracker" title="kodanTRACKER" subtitle="Gestión de proyectos" onLoginSuccess={handleLoginSuccess} onGoToSetPassword={() => setView('set-password')} />;
  }

  if (view === 'set-password') {
    return <SetPassword title="kodanTRACKER" onBackToLogin={() => setView('login')} />;
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar
        title="kodanTRACKER"
        logo="/logo.png"
        navItems={navItems}
        activeKey="dashboard"
        onNavigate={() => {}}
        user={user}
        onLogout={handleLogout}
        theme={theme}
        onThemeToggle={toggleTheme}
      />
      <main className="flex-1 p-6 lg:p-10 min-w-0 overflow-x-hidden" style={{ background: 'var(--sys-bg)', minHeight: '100dvh' }}>
        <div className="mx-auto" style={{ maxWidth: '1400px' }}>
          <Suspense fallback={
            <div className="flex items-center justify-center py-20">
              <div className="size-8 border-2 border-[var(--sys-primary)] border-t-transparent rounded-full animate-spin" />
            </div>
          }>
            <Dashboard />
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

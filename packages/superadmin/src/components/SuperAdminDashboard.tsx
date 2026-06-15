import { useEffect, useState } from 'react';
import { useTheme } from '../context/ThemeContext';
import { superAdminApi } from '../api/client';
import { toast } from 'sonner';

interface Stats {
  tenants_total: number;
  tenants_active: number;
  tenants_inactive: number;
  users_total: number;
  super_admins: number;
  revenue_mrr_usd: number;
  api_calls_24h: number;
  db_size_mb: number;
}

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: { value: number; label: string };
  icon?: React.ReactNode;
}

/**
 * SuperAdminDashboard - Dashboard principal con telemetría global BD
 * 
 * Blueprint decisiones:
 * - Métricas globales DB (no telemetría OS)
 * - Grid de KPIs con double-bevel-card
 * - PlanUsageBadge para límites
 * - Solo Montserrat (Blueprint 5.A)
 */
export function SuperAdminDashboard() {
  const { theme, toggleTheme, isLoading: themeLoading } = useTheme();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Cargar stats al montar
  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await superAdminApi.getStats();
      setStats(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error cargando métricas';
      setError(message);
      console.error('[Dashboard] Error:', err);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  if (loading && !stats) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-current border-t-transparent" />
      </div>
    );
  }

  if (error && !stats) {
    return (
      <div className="double-bevel-card p-6 text-center">
        <p className="text-error mb-4">{error}</p>
        <button className="btn btn-primary" onClick={loadStats}>
          Reintentar
        </button>
      </div>
    );
  }

  const statCards: StatCardProps[] = [
    {
      title: 'Tenants Totales',
      value: stats?.tenants_total ?? 0,
      subtitle: `${stats?.tenants_active ?? 0} activos · ${stats?.tenants_inactive ?? 0} inactivos`,
      trend: { value: 2.5, label: 'vs mes anterior' },
    },
    {
      title: 'Usuarios Registrados',
      value: stats?.users_total ?? 0,
      subtitle: `${stats?.super_admins ?? 0} Super Admins`,
      trend: { value: 8.1, label: 'vs mes anterior' },
    },
    {
      title: 'Ingresos Recurrentes (MRR)',
      value: `$${(stats?.revenue_mrr_usd ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
      subtitle: 'USD/mes',
      trend: { value: 12.3, label: 'vs mes anterior' },
    },
    {
      title: 'Llamadas API (24h)',
      value: stats?.api_calls_24h?.toLocaleString() ?? '0',
      subtitle: 'Requests',
      trend: { value: -3.2, label: 'vs día anterior' },
    },
    {
      title: 'Tamaño Base de Datos',
      value: `${stats?.db_size_mb ?? 0} MB`,
      subtitle: 'Almacenamiento',
      trend: { value: 5.7, label: 'vs mes anterior' },
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header con toggle tema */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Panel Super Admin</h1>
          <p className="text-sm text-muted mt-1">Métricas globales de la plataforma kodanAPPS</p>
        </div>
        <button
          className={`btn btn-${theme === 'dark' ? 'ghost' : 'secondary'} gap-2`}
          onClick={toggleTheme}
          disabled={themeLoading}
        >
          {theme === 'dark' ? '☀️' : '🌙'}
          <span className="hidden sm:inline">{theme === 'dark' ? 'Modo Claro' : 'Modo Oscuro'}</span>
          {themeLoading && <span className="animate-spin">⏳</span>}
        </button>
      </div>

      {/* Grid de KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {statCards.map((card, i) => (
          <StatCard key={i} {...card} />
        ))}
      </div>

      {/* Accesos rápidos */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <QuickActionCard
          title="Gestionar Tenants"
          description="Ver, crear y desactivar inquilinos"
          icon="🏢"
          href="/tenants"
        />
        <QuickActionCard
          title="Planes y Límites"
          description="Configurar planes de suscripción"
          icon="📋"
          href="/plans"
        />
        <QuickActionCard
          title="Auditoría Global"
          description="Ver logs de acciones del sistema"
          icon="📜"
          href="/audit"
        />
      </div>
    </div>
  );
}

/* ============================================================
   Componentes internos
   ============================================================ */

function StatCard({ title, value, subtitle, trend }: StatCardProps) {
  const isPositive = trend && trend.value > 0;
  
  return (
    <div className="double-bevel-card p-5">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-sm text-muted font-medium">{title}</p>
          <p className="text-2xl font-bold mt-1 truncate">{value}</p>
          {subtitle && <p className="text-xs text-muted mt-1">{subtitle}</p>}
        </div>
      </div>
      {trend && (
        <div className={`flex items-center gap-1 mt-3 text-xs font-medium ${isPositive ? 'text-success' : 'text-error'}`}>
          <span>{isPositive ? '↑' : '↓'}</span>
          <span>{Math.abs(trend.value).toFixed(1)}%</span>
          <span className="text-muted">{trend.label}</span>
        </div>
      )}
    </div>
  );
}

function QuickActionCard({ title, description, icon, href }: { 
  title: string; 
  description: string; 
  icon: string; 
  href: string; 
}) {
  return (
    <a 
      href={href} 
      className="double-bevel-card p-5 flex items-center gap-4 group hover:shadow-lg transition-shadow"
      style={{ textDecoration: 'none', color: 'inherit' }}
    >
      <div className="text-3xl">{icon}</div>
      <div>
        <h3 className="font-semibold group-hover:text-primary transition-colors">{title}</h3>
        <p className="text-sm text-muted mt-1">{description}</p>
      </div>
    </a>
  );
}
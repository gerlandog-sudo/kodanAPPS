import { createContext, useContext, useEffect, useOptimistic, useCallback, useState, ReactNode } from 'react';

type Theme = 'light' | 'dark';

interface ThemeContextValue {
  theme: Theme;
  toggleTheme: () => Promise<void>;
  isLoading: boolean;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

const STORAGE_KEY = 'superadmin-theme';
const API_ENDPOINT = '/api/super-admin-theme';

/**
 * ThemeProvider - Contexto de tema con useOptimistic (React 19)
 * 
 * Blueprint decisiones:
 * - Solo Montserrat (Blueprint 5.A: "Tipografía Exclusiva: Montserrat... prohibido cualquier otra fuente")
 * - useOptimistic obligatorio para UI instantánea + rollback en error
 * - Transición CSS 350ms cubic-bezier(0.4, 0, 0.2, 1)
 * - Persistencia en user_configs via PUT /api/super-admin/theme
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  // Leer tema inicial de sessionStorage (rápido, no bloquea SSR)
  const initialTheme = (() => {
    if (typeof window !== 'undefined') {
      const stored = sessionStorage.getItem(STORAGE_KEY);
      if (stored === 'light' || stored === 'dark') return stored;
      // Fallback: prefers-color-scheme
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return 'dark'; // Default SSR
  })();

  // Estado optimista: UI inmediata, rollback automático en error
  const [optimisticTheme, setOptimisticTheme] = useOptimistic<Theme>(
    initialTheme,
    (state, newTheme: Theme) => newTheme
  );

  const [isLoading, setIsLoading] = useState(false);

  // Aplicar clase en <html> al cambiar tema optimista
  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('theme-light', 'theme-dark');
    root.classList.add(`theme-${optimisticTheme}`);
    sessionStorage.setItem(STORAGE_KEY, optimisticTheme);
  }, [optimisticTheme]);

  // Toggle con persistencia async + rollback en error
  const toggleTheme = useCallback(async () => {
    const newTheme: Theme = optimisticTheme === 'light' ? 'dark' : 'light';
    
    // 1. Optimistic update inmediato
    setOptimisticTheme(newTheme);
    setIsLoading(true);

    try {
      // 2. Persistir en backend
      const response = await fetch(API_ENDPOINT, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': sessionStorage.getItem('csrf_token') ?? '',
          'X-Requested-With': 'XMLHttpRequest',
        },
        credentials: 'include', // Cookies HttpOnly
        body: JSON.stringify({ theme: newTheme }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      // 3. Éxito: confirmar (useOptimistic ya actualizó)
      console.log('[Theme] Persisted successfully');
    } catch (error) {
      // 4. Error: rollback automático via useOptimistic
      console.error('[Theme] Persist failed, rolling back:', error);
      setOptimisticTheme(optimisticTheme === 'light' ? 'dark' : 'light'); // Rollback manual
      
      // Toast notification (usar sonner o similar)
      if (typeof window !== 'undefined' && (window as any).sonner) {
        (window as any).sonner.error('No se pudo guardar la preferencia de tema');
      }
    } finally {
      setIsLoading(false);
    }
  }, [optimisticTheme, setOptimisticTheme]);

  return (
    <ThemeContext.Provider value={{ theme: optimisticTheme, toggleTheme, isLoading }}>
      {children}
    </ThemeContext.Provider>
  );
}

/**
 * Hook para consumir tema
 */
export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
}
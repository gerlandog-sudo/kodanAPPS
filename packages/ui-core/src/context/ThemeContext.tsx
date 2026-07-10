import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react'
import { toast } from 'sonner'

type Theme = 'light' | 'dark'

export interface ThemeApiClient {
  updateTheme: (theme: Theme) => Promise<void>
  getTheme: () => Promise<{ theme?: string }>
}

export interface ThemeContextValue {
  theme: Theme
  toggleTheme: () => Promise<void>
  setTheme: (t: Theme) => void
  isLoading: boolean
  loadUserTheme: () => Promise<void>
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

const STORAGE_KEY = 'kodan-theme'

export function ThemeProvider({
  children,
  defaultTheme = 'light',
  onThemeChange,
  apiClient,
}: {
  children: ReactNode
  defaultTheme?: Theme
  onThemeChange?: (theme: Theme) => void
  apiClient?: ThemeApiClient
}) {
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored === 'dark' || stored === 'light') return stored
    }
    return defaultTheme
  })
  const [isLoading, setIsLoading] = useState(false)

  const applyTheme = useCallback((t: Theme) => {
    document.documentElement.style.colorScheme = t
  }, [])

  useEffect(() => {
    applyTheme(theme)
  }, [theme, applyTheme])

  const setTheme = useCallback((t: Theme) => {
    localStorage.setItem(STORAGE_KEY, t)
    onThemeChange?.(t)
    setThemeState(t)
  }, [onThemeChange])

  const toggleTheme = useCallback(async () => {
    const prev = theme
    const next: Theme = prev === 'light' ? 'dark' : 'light'

    // Optimistically apply
    localStorage.setItem(STORAGE_KEY, next)
    onThemeChange?.(next)
    setThemeState(next)

    if (apiClient) {
      setIsLoading(true)
      try {
        await apiClient.updateTheme(next)
        toast.success(`Tema cambiado a ${next === 'light' ? 'Claro' : 'Oscuro'}`)
      } catch {
        // Revert on failure
        localStorage.setItem(STORAGE_KEY, prev)
        onThemeChange?.(prev)
        setThemeState(prev)
        toast.error('Error al guardar el tema')
      } finally {
        setIsLoading(false)
      }
    }
  }, [theme, onThemeChange, apiClient])

  const loadUserTheme = useCallback(async () => {
    if (!apiClient) return
    setIsLoading(true)
    try {
      const data = await apiClient.getTheme()
      if (data?.theme === 'light' || data?.theme === 'dark') {
        localStorage.setItem(STORAGE_KEY, data.theme)
        onThemeChange?.(data.theme)
        setThemeState(data.theme)
      }
    } catch {
      console.warn('[ThemeProvider] No se pudo cargar la preferencia de tema del usuario.');
    } finally {
      setIsLoading(false)
    }
  }, [apiClient, onThemeChange])

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme, isLoading, loadUserTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within a ThemeProvider')
  return ctx
}

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'
import { ThemeProvider as CoreThemeProvider, useTheme as useCoreTheme } from '@kodan-apps/ui-core'
import { superAdminApi } from '../api/client'
import { toast } from 'sonner'

type Theme = 'light' | 'dark'

interface ThemeContextValue {
  theme: Theme
  toggleTheme: () => Promise<void>
  isLoading: boolean
  loadUserTheme: () => Promise<void>
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined)

function ThemeInner({ children }: { children: ReactNode }) {
  const { theme, toggleTheme: coreToggle, setTheme } = useCoreTheme()
  const [isLoading, setIsLoading] = useState(false)

  const toggleTheme = useCallback(async () => {
    const prev = theme
    const next = prev === 'light' ? 'dark' : 'light'
    coreToggle()
    setIsLoading(true)
    try {
      await superAdminApi.updateTheme(next)
      toast.success(`Tema cambiado a ${next === 'light' ? 'Claro' : 'Oscuro'}`)
    } catch {
      setTheme(prev)
      toast.error('Error al guardar el tema')
    } finally {
      setIsLoading(false)
    }
  }, [theme, coreToggle, setTheme])

  const loadUserTheme = useCallback(async () => {
    try {
      const data = await superAdminApi.getTheme()
      if (data?.theme === 'light' || data?.theme === 'dark') {
        setTheme(data.theme)
      }
    } catch {
      console.warn('[ThemeContext] No se pudo cargar la preferencia de tema del usuario.');
    }
  }, [setTheme])

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, isLoading, loadUserTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  return (
    <CoreThemeProvider defaultTheme="light">
      <ThemeInner>{children}</ThemeInner>
    </CoreThemeProvider>
  )
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider')
  return ctx
}

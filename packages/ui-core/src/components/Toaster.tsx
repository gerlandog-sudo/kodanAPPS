import { Toaster as SonnerToaster } from 'sonner'

export function Toaster() {
  return (
    <SonnerToaster
      richColors
      position="top-right"
      toastOptions={{
        style: {
          fontFamily: 'var(--font-hanken)',
          fontSize: '0.875rem',
        },
      }}
    />
  )
}

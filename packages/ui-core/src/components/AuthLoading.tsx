export function AuthLoading() {
  return (
    <div className="flex items-center justify-center min-h-screen" style={{ background: 'var(--sys-bg)' }}>
      <div className="flex flex-col items-center gap-4">
        <div className="size-8 border-2 border-[var(--sys-primary)] border-t-transparent rounded-full animate-spin" />
        <span className="text-sm" style={{ color: 'var(--sys-text-muted)' }}>Verificando sesión...</span>
      </div>
    </div>
  );
}

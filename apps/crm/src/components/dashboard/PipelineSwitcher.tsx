import { useRef, useEffect } from 'react'
import gsap from 'gsap'

interface PipelineSwitcherProps {
  pipelines: { id: number; name: string; color_hex?: string }[]
  selectedId: string | number
  onChange: (id: string | number) => void
  loading?: boolean
}

export function PipelineSwitcher({ pipelines, selectedId, onChange, loading }: PipelineSwitcherProps) {
  const indicatorRef = useRef<HTMLDivElement>(null!)
  const pillsRef = useRef<Map<string | number, HTMLButtonElement>>(new Map())
  const containerRef = useRef<HTMLDivElement>(null!)

  useEffect(() => {
    if (!indicatorRef.current || !selectedId) return
    const activePill = pillsRef.current.get(selectedId)
    if (!activePill) return

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (prefersReducedMotion) {
      indicatorRef.current.style.transform = `translateX(${activePill.offsetLeft}px)`
      indicatorRef.current.style.width = `${activePill.offsetWidth}px`
      return
    }

    gsap.to(indicatorRef.current, {
      x: activePill.offsetLeft,
      width: activePill.offsetWidth,
      duration: 0.3,
      ease: 'power2.out'
    })
  }, [selectedId])

  const setPillRef = (id: string | number, el: HTMLButtonElement | null) => {
    if (el) pillsRef.current.set(id, el)
    else pillsRef.current.delete(id)
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2 shrink-0">
        <h1 className="text-2xl font-bold tracking-tight" style={{ fontFamily: 'var(--font-montserrat)' }}>
          Dashboard Comercial
        </h1>
        {loading && (
          <span className="size-2 rounded-full animate-pulse shrink-0" style={{ background: 'var(--sys-primary)' }} />
        )}
      </div>

      <div ref={containerRef} className="relative flex gap-0.5 p-0.5 border rounded-lg w-fit overflow-x-auto scrollbar-none" style={{ borderColor: 'var(--sys-border-soft)', background: 'var(--sys-surface)' }}>
        <div
          className="absolute top-0.5 bottom-0.5 rounded-md z-10 pointer-events-none transition-[background] duration-200"
          style={{ background: 'var(--sys-primary-container)' }}
          ref={indicatorRef}
        />

        <button
          ref={(el) => setPillRef('all', el)}
          onClick={() => onChange('all')}
          className={`relative z-20 shrink-0 px-3 py-1.5 rounded-md text-xs font-semibold cursor-pointer select-none transition-colors duration-150 ${
            selectedId === 'all'
              ? 'text-on-primary-container'
              : 'text-text-muted hover:text-text hover:bg-surface-hover'
          }`}
        >
          Todos los Canales
        </button>

        {pipelines.map((p) => (
          <button
            key={p.id}
            ref={(el) => setPillRef(p.id, el)}
            onClick={() => onChange(p.id)}
            className={`relative z-20 shrink-0 flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-semibold cursor-pointer select-none transition-colors duration-150 ${
              selectedId === p.id
                ? 'text-on-primary-container'
                : 'text-text-muted hover:text-text hover:bg-surface-hover'
            }`}
          >
            <span
              className="size-2 rounded-full shrink-0"
              style={{ background: p.color_hex || 'var(--sys-primary)' }}
            />
            {p.name}
          </button>
        ))}
      </div>
    </div>
  )
}

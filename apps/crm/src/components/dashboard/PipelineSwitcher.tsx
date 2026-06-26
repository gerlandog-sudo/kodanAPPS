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
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 shrink-0">
          <h1 className="text-2xl font-bold tracking-tight" style={{ fontFamily: 'var(--font-montserrat)' }}>
            Dashboard Comercial
          </h1>
          {loading && (
            <span className="size-2 rounded-full animate-pulse shrink-0" style={{ background: 'var(--sys-primary)' }} />
          )}
        </div>
      </div>

      <div ref={containerRef} className="relative flex gap-2 overflow-x-auto pb-1 scrollbar-none -mx-1 px-1">
        <div className="absolute bottom-0 left-0 h-0.5 rounded-full z-10 pointer-events-none" style={{ background: 'var(--sys-primary)' }} ref={indicatorRef} />

        <button
          ref={(el) => setPillRef('all', el)}
          onClick={() => onChange('all')}
          className={`
            relative shrink-0 px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer
            transition-all duration-200 select-none
            ${selectedId === 'all'
              ? 'text-on-primary shadow-md'
              : 'text-text-muted hover:text-text hover:bg-surface-hover border border-border-soft/50'
            }
          `}
          style={{
            background: selectedId === 'all' ? 'var(--sys-primary)' : 'transparent',
          }}
        >
          Todos los Canales
        </button>

        {pipelines.map((p) => (
          <button
            key={p.id}
            ref={(el) => setPillRef(p.id, el)}
            onClick={() => onChange(p.id)}
            className={`
              relative shrink-0 flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer
              transition-all duration-200 select-none
              ${selectedId === p.id
                ? 'text-on-primary shadow-md'
                : 'text-text-muted hover:text-text hover:bg-surface-hover border border-border-soft/50'
              }
            `}
            style={{
              background: selectedId === p.id ? 'var(--sys-primary)' : 'transparent',
            }}
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

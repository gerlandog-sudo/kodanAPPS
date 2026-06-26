import { useRef, useEffect } from 'react'
import gsap from 'gsap'

interface UseGsapStaggerOptions {
  stagger?: number
  y?: number
  duration?: number
  enabled?: boolean
  key?: string | number
}

export function useGsapStagger(options?: UseGsapStaggerOptions) {
  const containerRef = useRef<HTMLDivElement>(null!)
  const { stagger = 0.06, y = 16, duration = 0.4, enabled = true } = options || {}

  useEffect(() => {
    if (!enabled || !containerRef.current) return
    const children = containerRef.current.children
    if (children.length === 0) return

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (prefersReducedMotion) {
      gsap.set(children, { y: 0, opacity: 1 })
      return
    }

    gsap.set(children, { y, opacity: 0 })

    const ctx = gsap.context(() => {
      gsap.to(children, {
        y: 0,
        opacity: 1,
        stagger,
        duration,
        ease: 'power3.out',
        clearProps: 'transform'
      })
    }, containerRef)

    return () => ctx.revert()
  }, [stagger, y, duration, enabled, options?.key])

  return containerRef
}

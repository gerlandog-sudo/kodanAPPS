import { useRef, useEffect } from 'react'
import gsap from 'gsap'

export function useGsapCountUp(
  value: number,
  options?: { duration?: number; enabled?: boolean; prefix?: string; suffix?: string }
) {
  const ref = useRef<HTMLSpanElement>(null!)
  const { duration = 0.8, enabled = true, prefix = '', suffix = '' } = options || {}
  const prevValue = useRef(0)
  const tlRef = useRef<gsap.core.Tween | null>(null)

  useEffect(() => {
    if (!enabled || !ref.current) return
    if (prevValue.current === value) return

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (prefersReducedMotion) {
      ref.current.textContent = `${prefix}${value.toLocaleString('es-AR')}${suffix}`
      prevValue.current = value
      return
    }

    if (tlRef.current) tlRef.current.kill()

    const obj = { val: prevValue.current }
    tlRef.current = gsap.to(obj, {
      val: value,
      duration,
      ease: 'power2.out',
      onUpdate: () => {
        if (ref.current) {
          ref.current.textContent = `${prefix}${Math.round(obj.val).toLocaleString('es-AR')}${suffix}`
        }
      },
      onComplete: () => {
        prevValue.current = value
        if (ref.current) {
          ref.current.textContent = `${prefix}${value.toLocaleString('es-AR')}${suffix}`
        }
      }
    })

    return () => { tlRef.current?.kill() }
  }, [value, duration, enabled, prefix, suffix])

  return ref
}

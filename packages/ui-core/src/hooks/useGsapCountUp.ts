import { useRef, useEffect } from 'react'
import gsap from 'gsap'

export function useGsapCountUp(
  value: number,
  options?: { duration?: number; enabled?: boolean; prefix?: string; suffix?: string; decimalPlaces?: number }
) {
  const ref = useRef<HTMLSpanElement>(null!)
  const { duration = 0.8, enabled = true, prefix = '', suffix = '', decimalPlaces = 0 } = options || {}
  const prevValue = useRef(0)
  const tlRef = useRef<gsap.core.Tween | null>(null)

  const fmt = (v: number) => v.toLocaleString('es-AR', {
    minimumFractionDigits: decimalPlaces,
    maximumFractionDigits: decimalPlaces,
  })

  useEffect(() => {
    if (!enabled || !ref.current) return
    if (prevValue.current === value) return

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (prefersReducedMotion) {
      ref.current.textContent = `${prefix}${fmt(value)}${suffix}`
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
          ref.current.textContent = `${prefix}${fmt(obj.val)}${suffix}`
        }
      },
      onComplete: () => {
        prevValue.current = value
        if (ref.current) {
          ref.current.textContent = `${prefix}${fmt(value)}${suffix}`
        }
      }
    })

    return () => { tlRef.current?.kill() }
  }, [value, duration, enabled, prefix, suffix, decimalPlaces])

  return ref
}

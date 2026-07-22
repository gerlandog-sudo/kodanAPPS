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

  // Sanitize: treat NaN/Infinity as 0 to avoid "NaN" rendering
  const isValid = Number.isFinite(value)
  const safeValue = isValid ? value : 0

  const fmt = (v: number) => {
    const safe = Number.isFinite(v) ? v : 0
    return safe.toLocaleString('es-AR', {
      minimumFractionDigits: decimalPlaces,
      maximumFractionDigits: decimalPlaces,
    })
  }

  useEffect(() => {
    if (!enabled || !ref.current) return

    // If value is invalid, just show fallback without animating
    if (!isValid) {
      ref.current.textContent = `${prefix}0${suffix}`
      return
    }

    if (prevValue.current === safeValue) return

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (prefersReducedMotion) {
      ref.current.textContent = `${prefix}${fmt(safeValue)}${suffix}`
      prevValue.current = safeValue
      return
    }

    if (tlRef.current) tlRef.current.kill()

    const obj = { val: prevValue.current }
    tlRef.current = gsap.to(obj, {
      val: safeValue,
      duration,
      ease: 'power2.out',
      onUpdate: () => {
        if (ref.current) {
          ref.current.textContent = `${prefix}${fmt(obj.val)}${suffix}`
        }
      },
      onComplete: () => {
        prevValue.current = safeValue
        if (ref.current) {
          ref.current.textContent = `${prefix}${fmt(safeValue)}${suffix}`
        }
      }
    })

    return () => { tlRef.current?.kill() }
  }, [safeValue, isValid, duration, enabled, prefix, suffix, decimalPlaces])

  return ref
}

/**
 * Utilidades de color compartidas.
 * Permiten derivar variantes (fondo, borde) a partir de cualquier color
 * (hex `#RRGGBB` o token `var(--sys-*)`), de modo que los colores de
 * negocio (p. ej. etapas de pipeline) funcionen sin paletas hardcodeadas.
 */

/** Mezcla `color` con transparente al `percent` indicado (0-100). */
export function withAlpha(color: string, percent: number): string {
  return `color-mix(in srgb, ${color} ${percent}%, transparent)`
}

/** Tinta `color` sobre la superficie al `percent` indicado (0-100). Ideal para fondos de chip. */
export function tintWithSurface(color: string, percent: number): string {
  return `color-mix(in srgb, ${color} ${percent}%, var(--sys-surface))`
}

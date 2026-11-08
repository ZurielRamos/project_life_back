/** Utilidades de color en formato #RRGGBB. */

const HEX = /^#[0-9a-fA-F]{6}$/

export function isHexColor(value: string): boolean {
  return HEX.test(value)
}

function channels(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

/** Luminancia relativa según WCAG 2.x (0 = negro, 1 = blanco). */
export function luminance(hex: string): number {
  const [r, g, b] = channels(hex).map((c) => {
    const s = c / 255
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

/** Relación de contraste WCAG entre dos colores (1 a 21). */
export function contrastRatio(a: string, b: string): number {
  const la = luminance(a)
  const lb = luminance(b)
  const [hi, lo] = la >= lb ? [la, lb] : [lb, la]
  return (hi + 0.05) / (lo + 0.05)
}

export type ContrastLevel = "AAA" | "AA" | "AA-large" | "low"

/** Nivel WCAG alcanzado por una relación de contraste (texto normal). */
export function contrastLevel(ratio: number): ContrastLevel {
  if (ratio >= 7) return "AAA"
  if (ratio >= 4.5) return "AA"
  if (ratio >= 3) return "AA-large"
  return "low"
}

/** Mezcla `hex` con `other` (pct = % de `hex`), como color-mix en sRGB. */
export function mix(hex: string, other: string, pct: number): string {
  const a = channels(hex)
  const b = channels(other)
  const t = pct / 100
  const c = a.map((v, i) => Math.round(v * t + b[i] * (1 - t)))
  return `#${c.map((v) => v.toString(16).padStart(2, "0")).join("")}`
}

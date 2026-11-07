/**
 * Utilidades para plantillas SVG con campos de texto editables.
 *
 * Convención: un campo editable es un elemento `<text id="...">` de TEXTO
 * PLANO (recto o con inclinación uniforme; el texto en curva no es editable
 * y debe ir como contornos en el arte). El contenido del `<text>` (incluidos
 * sus `<tspan>`) es el valor por defecto / placeholder.
 */

/** Prefijo de las claves sintéticas para <text> sin id (por posición). */
export const SYNTHETIC_FIELD_PREFIX = "__text"

export type TextAlign = "left" | "center" | "right"

export interface SvgTextField {
  /**
   * Clave del campo. Es el `id` del `<text>` si lo tiene; si no, una clave
   * sintética por posición (`__text0`, `__text1`, ...). El backend usa esta
   * misma clave/numeración para localizar el `<text>` al sustituir.
   */
  id: string
  /** Texto actual del elemento (valor por defecto / placeholder). */
  defaultText: string
  /** Familia tipográfica del campo (font-family), si se pudo resolver. */
  fontFamily: string | null
  /** Tamaño de fuente en px (para medir el texto original). */
  fontSizePx: number | null
  /**
   * Origen del texto original en coordenadas del SVG (tras aplicar el
   * `transform` del <text> y el x/y del primer tspan). Es el punto donde
   * empieza el texto; sirve para calcular el eje de alineación.
   */
  originX: number
  originY: number
  /** Etiqueta visible para el input (id real o "Texto N"). */
  label: string
}

export interface ParsedSvg {
  /** Campos de texto editables detectados (<text id>). */
  fields: SvgTextField[]
  /** Todas las familias tipográficas referenciadas por los campos. */
  fontFamilies: string[]
  /** true si el SVG se parseó sin errores. */
  valid: boolean
}

/** Normaliza una font-family: primera de la lista, sin comillas. */
function normalizeFamily(value: string | null | undefined): string | null {
  if (!value) return null
  const first = value.split(",")[0].trim().replace(/^['"]|['"]$/g, "")
  return first || null
}

interface ClassStyle {
  fontFamily?: string
  fontSizePx?: number
}

/**
 * Construye un mapa `clase -> { fontFamily, fontSizePx }` a partir de los
 * bloques `<style>`. Illustrator declara tipografía y tamaño por clase, p.ej.
 * `.cls-1 { font-family: Outfit-Bold, Outfit; font-size: 12px; }`.
 */
function buildClassStyleMap(doc: Document): Map<string, ClassStyle> {
  const map = new Map<string, ClassStyle>()
  doc.querySelectorAll("style").forEach((styleEl) => {
    const css = styleEl.textContent ?? ""
    const ruleRe = /\.([\w-]+)\s*\{([^}]*)\}/g
    let rule: RegExpExecArray | null
    while ((rule = ruleRe.exec(css)) !== null) {
      const className = rule[1]
      const body = rule[2]
      const fam = normalizeFamily(
        body.match(/font-family\s*:\s*([^;]+)/i)?.[1]
      )
      const sizeStr = body.match(/font-size\s*:\s*([\d.]+)\s*px/i)?.[1]
      const existing = map.get(className) ?? {}
      map.set(className, {
        fontFamily: fam ?? existing.fontFamily,
        fontSizePx: sizeStr ? Number(sizeStr) : existing.fontSizePx,
      })
    }
  })
  return map
}

/** Lee la traslación (x, y) de un atributo transform="translate(x y)". */
function parseTranslate(transform: string | null): { x: number; y: number } {
  if (!transform) return { x: 0, y: 0 }
  const m = transform.match(
    /translate\(\s*([-\d.]+)[\s,]+([-\d.]+)\s*\)/i
  )
  if (!m) {
    // translate(x) con un solo valor => y = 0.
    const single = transform.match(/translate\(\s*([-\d.]+)\s*\)/i)
    return { x: single ? Number(single[1]) : 0, y: 0 }
  }
  return { x: Number(m[1]), y: Number(m[2]) }
}

/** Resuelve el font-size (px) de un elemento por atributo, style o clase. */
function resolveFontSize(
  el: Element,
  classStyleMap: Map<string, ClassStyle>
): number | null {
  const attr = el.getAttribute("font-size")
  if (attr) {
    const n = Number(attr.replace(/px$/i, ""))
    if (!Number.isNaN(n)) return n
  }
  const inline = el
    .getAttribute("style")
    ?.match(/font-size\s*:\s*([\d.]+)\s*px/i)?.[1]
  if (inline) return Number(inline)
  const classNames = [
    ...(el.getAttribute("class")?.split(/\s+/) ?? []),
    ...Array.from(el.querySelectorAll("[class]")).flatMap(
      (c) => c.getAttribute("class")?.split(/\s+/) ?? []
    ),
  ]
  for (const cn of classNames) {
    const size = classStyleMap.get(cn)?.fontSizePx
    if (size) return size
  }
  return null
}

/** Resuelve la font-family de un elemento: atributo, style inline o clase. */
function resolveFontFamily(
  el: Element,
  classStyleMap: Map<string, ClassStyle>
): string | null {
  // 1) atributo font-family directo
  const attr = normalizeFamily(el.getAttribute("font-family"))
  if (attr) return attr
  // 2) style inline
  const inline = normalizeFamily(
    el.getAttribute("style")?.match(/font-family\s*:\s*([^;]+)/i)?.[1]
  )
  if (inline) return inline
  // 3) por clase (incluye las de los <tspan> hijos)
  const classNames = [
    ...(el.getAttribute("class")?.split(/\s+/) ?? []),
    ...Array.from(el.querySelectorAll("[class]")).flatMap(
      (c) => c.getAttribute("class")?.split(/\s+/) ?? []
    ),
  ]
  for (const cn of classNames) {
    const fam = classStyleMap.get(cn)?.fontFamily
    if (fam) return fam
  }
  return null
}

/**
 * Parsea un SVG (texto) y extrae sus campos editables (`<text id>`). El texto
 * de cada campo se obtiene concatenando sus `<tspan>` (o su textContent). La
 * font-family se resuelve desde atributo, style inline o clase CSS.
 */
export function parseSvgTemplate(svg: string): ParsedSvg {
  const doc = new DOMParser().parseFromString(svg, "image/svg+xml")
  const parserError = doc.querySelector("parsererror")
  if (parserError) {
    return { fields: [], fontFamilies: [], valid: false }
  }

  const classStyleMap = buildClassStyleMap(doc)
  const fields: SvgTextField[] = []
  const families = new Set<string>()

  // TODOS los <text> son editables (opción B). Los que no tienen id reciben
  // una clave sintética por posición (índice sobre el total de <text>).
  const allTexts = Array.from(doc.querySelectorAll("text"))
  let synthetic = 0
  allTexts.forEach((el, index) => {
    const realId = el.getAttribute("id")
    const key = realId ?? `${SYNTHETIC_FIELD_PREFIX}${index}`
    const label = realId ?? `Texto ${synthetic + 1}`
    if (!realId) synthetic += 1

    // textContent ya concatena el texto de los <tspan> hijos.
    const defaultText = (el.textContent ?? "").replace(/\s+/g, " ").trim()
    const fontFamily = resolveFontFamily(el, classStyleMap)
    if (fontFamily) families.add(fontFamily)
    const fontSizePx = resolveFontSize(el, classStyleMap)

    // Origen del texto = translate del <text> + x/y del primer tspan.
    const t = parseTranslate(el.getAttribute("transform"))
    const firstTspan = el.querySelector("tspan")
    const tx = Number(firstTspan?.getAttribute("x") ?? "0") || 0
    const ty = Number(firstTspan?.getAttribute("y") ?? "0") || 0

    fields.push({
      id: key,
      defaultText,
      fontFamily,
      fontSizePx,
      originX: t.x + tx,
      originY: t.y + ty,
      label,
    })
  })

  return { fields, fontFamilies: [...families], valid: true }
}

/** Detecta por extensión/contenido si un archivo es SVG. */
export function isSvgFile(file: File): boolean {
  return (
    file.type === "image/svg+xml" || file.name.toLowerCase().endsWith(".svg")
  )
}

// --- Medición de texto y cálculo del eje de alineación ---

const loadedFonts = new Set<string>()

/**
 * Asegura que una fuente esté cargada en el documento para poder medirla.
 * Descarga el archivo desde `fileUrl` y la registra con `FontFace` bajo la
 * familia `family`. Idempotente.
 */
export async function ensureFontLoaded(
  family: string,
  fileUrl: string
): Promise<void> {
  if (loadedFonts.has(family)) return
  try {
    const face = new FontFace(family, `url(${JSON.stringify(fileUrl)})`)
    await face.load()
    document.fonts.add(face)
    loadedFonts.add(family)
  } catch {
    // Si falla la carga, la medición caerá en una fuente de reserva.
  }
}

/**
 * Mide el ancho de un texto en coordenadas del SVG (mismas unidades que
 * `fontSizePx`), usando Canvas con la fuente indicada. Devuelve 0 si no se
 * puede medir.
 */
export function measureTextWidth(
  text: string,
  fontFamily: string | null,
  fontSizePx: number
): number {
  if (!text) return 0
  const canvas = document.createElement("canvas")
  const ctx = canvas.getContext("2d")
  if (!ctx) return 0
  const family = fontFamily ? `"${fontFamily}"` : "sans-serif"
  ctx.font = `${fontSizePx}px ${family}, sans-serif`
  return ctx.measureText(text).width
}

/**
 * Calcula el punto de anclaje X y el text-anchor para alinear el texto nuevo
 * respecto al texto original. Usa el ancho del texto ORIGINAL para ubicar sus
 * bordes izquierdo/centro/derecho; el texto nuevo se anclará a ese punto.
 */
export function computeAnchor(
  field: SvgTextField,
  align: TextAlign
): { anchorX: number; anchorY: number; textAnchor: "start" | "middle" | "end" } {
  const size = field.fontSizePx ?? 12
  const originalWidth = measureTextWidth(
    field.defaultText,
    field.fontFamily,
    size
  )
  const left = field.originX
  const right = field.originX + originalWidth
  const center = field.originX + originalWidth / 2

  if (align === "left") {
    return { anchorX: left, anchorY: field.originY, textAnchor: "start" }
  }
  if (align === "right") {
    return { anchorX: right, anchorY: field.originY, textAnchor: "end" }
  }
  return { anchorX: center, anchorY: field.originY, textAnchor: "middle" }
}

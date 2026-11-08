import { useCallback, useEffect, useRef, useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import {
  ArrowLeft,
  Eye,
  ImagePlus,
  Loader2,
  Pencil,
  Sparkles,
  Star,
  Trash2,
} from "lucide-react"

import { ApiError } from "@/lib/api"
import {
  generateDesign,
  previewDesign,
  renderDesignSvg,
  uploadDesignImage,
} from "@/lib/designs-api"
import { createFont, listFonts } from "@/lib/fonts-api"
import {
  getProduct,
  getProductCompatibilities,
  listProducts,
} from "@/lib/products-api"
import { fileToDataUri } from "@/lib/file"
import {
  computeAnchor,
  ensureFontLoaded,
  isSvgFile,
  parseSvgTemplate,
  type SvgTextField,
  type TextAlign,
} from "@/lib/svg-template"
import type {
  CompatibilityLink,
  ProductColor,
  DesignArea,
  DesignPrintArea,
  DesignSeoView,
  Font,
  PhotoSession,
  Product,
  ProductSummary,
  RenderSvgField,
} from "@/types/api"
import { Button } from "@/components/ui/button"
import { AppHeader } from "@/components/app-header"
import { Combobox } from "@/components/ui/combobox"
import { Label } from "@/components/ui/label"
import { SortableList } from "@/components/ui/sortable"
import { AreaCanvas, type Placement } from "@/components/designs/area-canvas"
import { SvgFieldsDialog } from "@/components/designs/svg-fields-dialog"

/**
 * Lista de colores reordenable arrastrando (asa ⋮⋮, o ↑ ↓ con el teclado).
 * Clic en la fila activa/desactiva el color.
 */
function ColorOrderList({
  colors,
  order,
  isActive,
  onReorder,
  onToggle,
}: {
  colors: ProductColor[]
  order: string[]
  isActive: (colorId: string) => boolean
  onReorder: (order: string[]) => void
  onToggle: (colorId: string) => void
}) {
  const byId = new Map(colors.map((c) => [c.id, c]))
  const items = order.filter((id) => byId.has(id))
  return (
    <SortableList
      items={items}
      onReorder={onReorder}
      itemLabel="color"
      getItemName={(id) => byId.get(id)?.name ?? "color"}
      className="flex flex-col gap-1.5"
      renderItem={(colorId, { handle }) => {
        const color = byId.get(colorId)!
        const active = isActive(colorId)
        return (
          <div
            data-keep-selection
            className={
              "flex items-center gap-1 rounded-lg border py-1 pr-2 pl-1 transition-colors " +
              (active
                ? "border-neutral-900 bg-neutral-50"
                : "border-neutral-200 opacity-60")
            }
          >
            {handle}
            <button
              type="button"
              aria-pressed={active}
              onClick={() => onToggle(colorId)}
              className="flex min-w-0 flex-1 items-center gap-2 text-left text-sm"
            >
              <span
                className="size-4 shrink-0 rounded-full border border-black/10"
                style={{ backgroundColor: color.hex }}
              />
              <span className="min-w-0 flex-1 truncate text-neutral-700">
                {color.name}
              </span>
              <span
                className={
                  "size-3.5 shrink-0 rounded-full border " +
                  (active
                    ? "border-neutral-900 bg-neutral-900"
                    : "border-neutral-300")
                }
              />
            </button>
          </div>
        )
      }}
    />
  )
}

let keyCounter = 0
function nextKey(): string {
  keyCounter += 1
  return `pl_${keyCounter}`
}

/**
 * Deriva las áreas de diseño desde los smart objects "dise" del primer
 * mockup de la primera sesión del producto. Cada área = un smart object,
 * con su nombre y su tamaño en px de la plantilla (B1).
 */
function deriveDesignAreas(product: Product | null): DesignPrintArea[] {
  if (!product) return []
  const sessions = [...(product.photoSessions ?? [])]
    .filter((s) => (s.mockups ?? []).length > 0)
    .sort(
      (a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    )

  const objectsOf = (session: PhotoSession): DesignArea[] => {
    const firstMockup = [...(session.mockups ?? [])].sort(
      (a, b) => a.position - b.position
    )[0]
    return (firstMockup?.smartObjects ?? [])
      .filter((so) => (so.name ?? "").toLowerCase().startsWith("dise"))
      .map((so) => ({
        smartObjectUuid: so.uuid,
        // El nombre del smart object suele venir como "diseo"; se muestra
        // como "Diseño" en la UI (reemplazo global, case-insensitive).
        name: (so.name ?? "Diseño").replace(/diseo/gi, "Diseño"),
        widthPx: so.size?.width ?? 100,
        heightPx: so.size?.height ?? 100,
      }))
  }

  // Una entrada por área de impresión: su primera sesión anclada con mockups.
  const areas = [...(product.printAreas ?? [])].sort(
    (a, b) => a.position - b.position
  )
  const groups: DesignPrintArea[] = []
  for (const area of areas) {
    const session = sessions.find((s) => s.printAreaId === area.id)
    if (!session) continue
    const objects = objectsOf(session)
    if (objects.length > 0) {
      groups.push({ id: area.id, name: area.name, objects })
    }
  }
  if (groups.length > 0) return groups

  // Productos antiguos sin sesiones ancladas: una sola área con la primera
  // sesión (igual que el backend).
  if (sessions[0]) {
    const objects = objectsOf(sessions[0])
    if (objects.length > 0) {
      return [{ id: "legacy", name: "Área de diseño", objects }]
    }
  }
  return []
}

/**
 * Editor local de un diseño nuevo. No crea nada en la BD hasta pulsar
 * "Generar": compone placements (en mm) por área y los colores a renderizar,
 * y al generar crea el diseño (estado "generating") y navega a su detalle.
 */
export function DesignNewPage() {
  const navigate = useNavigate()

  const [products, setProducts] = useState<ProductSummary[]>([])
  const [loadingProducts, setLoadingProducts] = useState(true)
  const [productId, setProductId] = useState("")
  const [product, setProduct] = useState<Product | null>(null)
  const [loadingProduct, setLoadingProduct] = useState(false)

  const [placements, setPlacements] = useState<Placement[]>([])
  const [selectedKey, setSelectedKey] = useState<string | null>(null)
  // Área de impresión principal elegida (id de PrintArea).
  const [mainAreaId, setMainAreaId] = useState<string | null>(null)
  // Copyright del diseño: null = aún sin elegir (es obligatorio).
  // Compatibilidades del producto y productos extra elegidos para replicar.
  const [compatLinks, setCompatLinks] = useState<CompatibilityLink[]>([])
  // Productos extra elegidos -> colores elegidos (ids del producto destino,
  // en orden de selección), y el detalle de cada uno (para listar sus colores).
  const [targetState, setTargetState] = useState<
    Record<string, { order: string[]; active: string[] }>
  >({})
  const [targetProducts, setTargetProducts] = useState<Record<string, Product>>(
    {}
  )
  const [loadingTarget, setLoadingTarget] = useState<string | null>(null)
  const [hasCopyright, setHasCopyright] = useState<boolean | null>(null)
  const [colorOrder, setColorOrder] = useState<string[]>([])
  const [activeColorIds, setActiveColorIds] = useState<Set<string>>(new Set())

  const [uploadingArea, setUploadingArea] = useState<string | null>(null)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Vista previa efímera (no persiste): render del primer color + SEO.
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [previewSeo, setPreviewSeo] = useState<DesignSeoView | null>(null)
  const [previewingArea, setPreviewingArea] = useState<string | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const targetAreaRef = useRef<DesignArea | null>(null)

  // Fuentes registradas (con su archivo, para medir texto en el cliente).
  const [fonts, setFonts] = useState<Font[]>([])
  // Flujo de plantilla SVG en edición (campos de texto por llenar).
  const [svgDraft, setSvgDraft] = useState<{
    area: DesignArea
    svg: string
    fields: SvgTextField[]
    values: Record<string, string>
    aligns: Record<string, TextAlign>
    missingFonts: string[]
  } | null>(null)
  const [applyingSvg, setApplyingSvg] = useState(false)

  const fontFamilies = fonts.map((f) => f.family)

  // Carga las fuentes registradas (para el aviso de fuente faltante).
  const loadFonts = useCallback(() => {
    listFonts()
      .then((list) => setFonts(list))
      .catch(() => {
        /* silencioso: el aviso de fuentes es best-effort */
      })
  }, [])

  useEffect(() => {
    loadFonts()
  }, [loadFonts])

  // Carga la lista de productos para el selector inicial.
  useEffect(() => {
    let active = true
    setLoadingProducts(true)
    listProducts()
      .then((data) => {
        if (active) setProducts(data)
      })
      .catch(() => {
        if (active) setError("No se pudieron cargar los productos.")
      })
      .finally(() => {
        if (active) setLoadingProducts(false)
      })
    return () => {
      active = false
    }
  }, [])

  // Al elegir producto, carga sus áreas/colores y reinicia el lienzo.
  const loadProduct = useCallback(async (pid: string) => {
    setLoadingProduct(true)
    setError(null)
    try {
      const [data, links] = await Promise.all([
        getProduct(pid),
        getProductCompatibilities(pid).catch(() => [] as CompatibilityLink[]),
      ])
      setProduct(data)
      setCompatLinks(links)
      setTargetState({})
      setTargetProducts({})
      const colorIds = (data.colors ?? []).map((c) => c.id)
      setColorOrder(colorIds)
      setActiveColorIds(new Set(colorIds))
      setPlacements([])
      setSelectedKey(null)
      setMainAreaId(null)
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : "No se pudo cargar el producto."
      setError(message)
    } finally {
      setLoadingProduct(false)
    }
  }, [])

  function handleProductChange(pid: string) {
    setProductId(pid)
    void loadProduct(pid)
  }

  // Deselecciona al hacer clic fuera de un canvas o de un control marcado.
  useEffect(() => {
    function handleGlobalPointerDown(event: MouseEvent) {
      const target = event.target as HTMLElement | null
      if (target && target.closest("[data-keep-selection]")) return
      setSelectedKey(null)
    }
    document.addEventListener("mousedown", handleGlobalPointerDown)
    return () =>
      document.removeEventListener("mousedown", handleGlobalPointerDown)
  }, [])

  function updatePlacement(key: string, patch: Partial<Placement>) {
    setPlacements((prev) =>
      prev.map((p) => (p.key === key ? { ...p, ...patch } : p))
    )
  }

  function removeSelected() {
    if (!selectedKey) return
    setPlacements((prev) => prev.filter((p) => p.key !== selectedKey))
    setSelectedKey(null)
  }

  /**
   * Reemplaza por completo las placements de un área (smart object). Lo usa
   * el canvas para aplicar deshacer/rehacer sin tocar las demás áreas.
   */
  function replaceAreaPlacements(
    smartObjectUuid: string,
    next: Placement[]
  ) {
    setPlacements((prev) => [
      ...prev.filter((p) => p.printAreaId !== smartObjectUuid),
      ...next,
    ])
    setSelectedKey(null)
  }

  /**
   * Activa/desactiva un producto compatible. Al activarlo carga sus colores;
   * los colores se eligen manualmente, por producto (ninguno preseleccionado).
   */
  async function toggleTarget(targetId: string) {
    if (targetId in targetState) {
      setTargetState((prev) => {
        const next = { ...prev }
        delete next[targetId]
        return next
      })
      return
    }
    setLoadingTarget(targetId)
    setError(null)
    try {
      const target = targetProducts[targetId] ?? (await getProduct(targetId))
      setTargetProducts((prev) => ({ ...prev, [targetId]: target }))
      setTargetState((prev) => ({
        ...prev,
        [targetId]: { order: target.colors.map((c) => c.id), active: [] },
      }))
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "No se pudo cargar el producto compatible."
      )
    } finally {
      setLoadingTarget(null)
    }
  }

  function toggleTargetColor(targetId: string, colorId: string) {
    setTargetState((prev) => {
      const cur = prev[targetId]
      if (!cur) return prev
      return {
        ...prev,
        [targetId]: {
          ...cur,
          active: cur.active.includes(colorId)
            ? cur.active.filter((c) => c !== colorId)
            : [...cur.active, colorId],
        },
      }
    })
  }

  function toggleColor(colorId: string) {
    setActiveColorIds((prev) => {
      const next = new Set(prev)
      if (next.has(colorId)) next.delete(colorId)
      else next.add(colorId)
      return next
    })
  }

  function triggerUpload(area: DesignArea) {
    targetAreaRef.current = area
    fileInputRef.current?.click()
  }

  /**
   * Coloca una imagen ya subida (url + dimensiones) en el área, ajustada al
   * tamaño máximo que entra sin salirse de ningún límite (fit/contain) y
   * centrada. Conserva la proporción de la imagen.
   */
  function placeImage(
    area: DesignArea,
    img: { url: string; publicId?: string; width: number; height: number },
    source?: {
      svgUrl: string
      fieldValues: Record<string, string>
      svgText: string
      fieldAligns: Record<string, string>
    }
  ) {
    const areaW = area.widthPx || 100
    const areaH = area.heightPx || 100
    const imgW = img.width || 1
    const imgH = img.height || 1
    // Escala "contain": el mayor factor que cabe en ambos ejes.
    const scale = Math.min(areaW / imgW, areaH / imgH)
    const w = imgW * scale
    const h = imgH * scale
    const key = nextKey()
    setPlacements((prev) => [
      // Una imagen por área: reemplaza la que hubiera en esta área.
      ...prev.filter((p) => p.printAreaId !== area.smartObjectUuid),
      {
        key,
        printAreaId: area.smartObjectUuid,
        imageUrl: img.url,
        imagePublicId: img.publicId,
        xMm: (areaW - w) / 2,
        yMm: (areaH - h) / 2,
        widthMm: w,
        heightMm: h,
        rotation: 0,
        svgUrl: source?.svgUrl,
        fieldValues: source?.fieldValues,
        svgText: source?.svgText,
        fieldAligns: source?.fieldAligns,
      },
    ])
    setSelectedKey(key)
  }

  async function handleFileSelected(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const file = event.target.files?.[0]
    event.target.value = ""
    const area = targetAreaRef.current
    if (!file || !area) return

    // --- Rama SVG: plantilla con posibles campos de texto editables. ---
    if (isSvgFile(file)) {
      const svg = await file.text()
      const parsed = parseSvgTemplate(svg)
      if (!parsed.valid) {
        setError("El SVG no se pudo leer. Revisa el archivo.")
        return
      }
      const missingFonts = parsed.fontFamilies.filter(
        (fam) => !fontFamilies.includes(fam)
      )
      // Carga en el navegador las fuentes disponibles para medir el texto.
      await Promise.all(
        fonts
          .filter((f) => parsed.fontFamilies.includes(f.family))
          .map((f) => ensureFontLoaded(f.family, f.fileUrl))
      )
      if (parsed.fields.length === 0) {
        // Sin campos editables: se rasteriza tal cual (arte puro), salvo que
        // falten fuentes (en cuyo caso applySvg abre el panel para subirlas).
        await applySvg(area, svg, parsed.fields, {}, {}, missingFonts)
        return
      }
      // Con campos: abre el panel de edición con los valores por defecto.
      const values: Record<string, string> = {}
      const aligns: Record<string, TextAlign> = {}
      parsed.fields.forEach((f) => {
        values[f.id] = f.defaultText
        aligns[f.id] = "center"
      })
      setSvgDraft({
        area,
        svg,
        fields: parsed.fields,
        values,
        aligns,
        missingFonts,
      })
      return
    }

    // --- Rama imagen raster: flujo original. ---
    setUploadingArea(area.smartObjectUuid)
    setError(null)
    try {
      const dataUri = await fileToDataUri(file)
      const uploaded = await uploadDesignImage(dataUri)
      placeImage(area, uploaded)
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : "No se pudo subir la imagen."
      setError(message)
    } finally {
      setUploadingArea(null)
    }
  }

  /**
   * Rasteriza el SVG con los valores dados y coloca el PNG en el área.
   * Exige que TODAS las fuentes del SVG estén registradas: si falta alguna,
   * no genera y deja/abre el panel para que el usuario las suba.
   */
  async function applySvg(
    area: DesignArea,
    svg: string,
    fields: SvgTextField[],
    values: Record<string, string>,
    aligns: Record<string, TextAlign>,
    missingFonts: string[]
  ) {
    if (missingFonts.length > 0) {
      // No se puede continuar sin las fuentes. Asegura el panel abierto con
      // las familias faltantes para que el usuario las registre.
      setSvgDraft({ area, svg, fields, values, aligns, missingFonts })
      setError(
        `Debes registrar las fuentes del diseño antes de continuar: ${missingFonts.join(
          ", "
        )}.`
      )
      return
    }

    setApplyingSvg(true)
    setError(null)
    try {
      // Construye los campos con su anclaje/alineación (medición con la
      // fuente real para hallar el eje correcto).
      const renderFields: RenderSvgField[] = fields.map((field) => {
        const anchor = computeAnchor(field, aligns[field.id] ?? "center")
        return {
          key: field.id,
          value: values[field.id] ?? "",
          anchorX: anchor.anchorX,
          anchorY: anchor.anchorY,
          textAnchor: anchor.textAnchor,
        }
      })

      const result = await renderDesignSvg({ svg, fields: renderFields })
      // Defensa adicional: el backend también reporta fuentes faltantes.
      if (result.missingFonts.length > 0) {
        setSvgDraft({
          area,
          svg,
          fields,
          values,
          aligns,
          missingFonts: result.missingFonts,
        })
        setError(
          `Debes registrar las fuentes del diseño antes de continuar: ${result.missingFonts.join(
            ", "
          )}.`
        )
        return
      }
      placeImage(area, result.image, {
        svgUrl: result.svgUrl,
        fieldValues: values,
        svgText: svg,
        fieldAligns: aligns,
      })
      setSvgDraft(null)
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : "No se pudo generar el diseño."
      setError(message)
    } finally {
      setApplyingSvg(false)
    }
  }

  /**
   * Reabre el editor de textos para un diseño SVG ya aplicado en un área,
   * precargado con los valores y alineaciones actuales. Re-parsea el SVG
   * guardado para reconstruir los campos.
   */
  async function editSvgPlacement(area: DesignArea) {
    const placement = placements.find(
      (p) => p.printAreaId === area.smartObjectUuid && p.svgText
    )
    if (!placement?.svgText) return

    const parsed = parseSvgTemplate(placement.svgText)
    const missingFonts = parsed.fontFamilies.filter(
      (fam) => !fontFamilies.includes(fam)
    )
    await Promise.all(
      fonts
        .filter((f) => parsed.fontFamilies.includes(f.family))
        .map((f) => ensureFontLoaded(f.family, f.fileUrl))
    )

    // Precarga con los valores/alineaciones guardados; cae en los del SVG.
    const values: Record<string, string> = {}
    const aligns: Record<string, TextAlign> = {}
    parsed.fields.forEach((f) => {
      values[f.id] = placement.fieldValues?.[f.id] ?? f.defaultText
      aligns[f.id] =
        (placement.fieldAligns?.[f.id] as TextAlign | undefined) ?? "center"
    })

    setSvgDraft({
      area,
      svg: placement.svgText,
      fields: parsed.fields,
      values,
      aligns,
      missingFonts,
    })
  }

  /**
   * Registra una fuente para una familia y la quita de las faltantes del
   * draft. La llama el modal de campos de texto cuando falta una fuente.
   */
  async function uploadFontForFamily(family: string, file: File) {
    setError(null)
    try {
      const dataUri = await fileToDataUri(file)
      const format = file.name.split(".").pop()?.toLowerCase()
      const created = await createFont({ family, dataUri, format })
      setFonts((prev) => [...prev.filter((f) => f.family !== family), created])
      // Carga la fuente en el navegador para poder medir el texto con ella.
      await ensureFontLoaded(created.family, created.fileUrl)
      setSvgDraft((prev) =>
        prev
          ? {
              ...prev,
              missingFonts: prev.missingFonts.filter((f) => f !== family),
            }
          : prev
      )
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : "No se pudo subir la fuente."
      setError(message)
    }
  }

  // Colores activos, en el orden definido por el usuario.
  const activeColorIdsOrdered = colorOrder.filter((cid) =>
    activeColorIds.has(cid)
  )
  // Primer color activo (el que se usa para la vista previa).
  const firstActiveColorId = activeColorIdsOrdered[0] ?? null

  /**
   * Genera una vista previa efímera del área: render del primer color activo
   * + SEO. No crea ni guarda nada en la BD.
   */
  async function handlePreview(group: DesignPrintArea) {
    if (!productId) return
    const uuids = new Set(group.objects.map((o) => o.smartObjectUuid))
    const groupPlacements = placements.filter((p) => uuids.has(p.printAreaId))
    if (groupPlacements.length === 0) {
      setError("Carga una imagen en esta área antes de previsualizar.")
      return
    }
    setPreviewingArea(group.id)
    setError(null)
    try {
      const result = await previewDesign({
        productId,
        // Cualquier smart object del área identifica el área en el backend.
        printAreaId: groupPlacements[0].printAreaId,
        placements: groupPlacements.map((p, index) => {
          const object = areaByUuid.get(p.printAreaId)
          return {
            printAreaId: p.printAreaId,
            imageUrl: p.imageUrl,
            imagePublicId: p.imagePublicId,
            xMm: p.xMm,
            yMm: p.yMm,
            widthMm: p.widthMm,
            heightMm: p.heightMm,
            rotation: p.rotation,
            authorAreaWidthPx: object?.widthPx,
            authorAreaHeightPx: object?.heightPx,
            zIndex: index,
          }
        }),
        colorId: firstActiveColorId ?? undefined,
      })
      setPreviewUrl(result.imageUrl)
      setPreviewSeo(result.seo)
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : "No se pudo generar la vista previa."
      setError(message)
    } finally {
      setPreviewingArea(null)
    }
  }

  async function handleGenerate() {
    if (!productId) {
      setError("Selecciona un producto.")
      return
    }
    if (placements.length === 0) {
      setError("Carga al menos una imagen antes de generar.")
      return
    }
    if (hasCopyright === null) {
      setError("Indica si el diseño tiene copyright.")
      return
    }
    // Con áreas de impresión ancladas hay que elegir la principal (si solo
    // hay una, es esa). En productos antiguos ("legacy") no aplica.
    const anchoredAreas = printAreas.filter((pa) => pa.id !== "legacy")
    const effectiveMainId =
      anchoredAreas.length === 1 ? anchoredAreas[0].id : mainAreaId
    if (anchoredAreas.length > 0) {
      if (!effectiveMainId) {
        setError("Selecciona el área de impresión principal del diseño.")
        return
      }
      const mainUuids = new Set(
        anchoredAreas
          .find((pa) => pa.id === effectiveMainId)
          ?.objects.map((o) => o.smartObjectUuid)
      )
      if (!placements.some((p) => mainUuids.has(p.printAreaId))) {
        setError(
          "El área principal debe tener al menos una imagen. Carga un archivo en ella o elige otra."
        )
        return
      }
    }
    // Cada producto compatible exige elegir sus colores (si los tiene).
    for (const t of chosenTargets) {
      const hasColors = (targetProducts[t.id]?.colors ?? []).length > 0
      if (hasColors && targetState[t.id].active.length === 0) {
        setError(`Elige al menos un color para ${t.name}.`)
        return
      }
    }
    setGenerating(true)
    setError(null)
    try {
      await generateDesign({
        productId,
        hasCopyright,
        mainPrintAreaId: anchoredAreas.length > 0 ? effectiveMainId! : undefined,
        compatibleProducts: chosenTargets.map((t) => ({
          productId: t.id,
          colorIds: targetState[t.id].order.filter((c) =>
            targetState[t.id].active.includes(c)
          ),
        })),
        placements: placements.map((p, index) => {
          const area = areaByUuid.get(p.printAreaId)
          return {
            printAreaId: p.printAreaId,
            imageUrl: p.imageUrl,
            imagePublicId: p.imagePublicId,
            xMm: p.xMm,
            yMm: p.yMm,
            widthMm: p.widthMm,
            heightMm: p.heightMm,
            rotation: p.rotation,
            // Tamaño del área contra la que se autoró la geometría, para que
            // el render escale a cada mockup de la sesión.
            authorAreaWidthPx: area?.widthPx,
            authorAreaHeightPx: area?.heightPx,
            zIndex: index,
            svgUrl: p.svgUrl,
            fieldValues: p.fieldValues,
          }
        }),
        colorIds: activeColorIdsOrdered,
      })
      navigate("/designs")
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : "No se pudo iniciar la generación."
      setError(message)
      setGenerating(false)
    }
  }

  // Áreas derivadas: un área por cada smart object "dise" del primer mockup
  // de la primera sesión del producto. El lienzo trabaja en px (B1).
  const printAreas = deriveDesignAreas(product)
  // Lookup del objeto inteligente por uuid, para adjuntar el tamaño de
  // autoría a cada placement al generar/previsualizar.
  const areaByUuid = new Map(
    printAreas.flatMap((pa) =>
      pa.objects.map((o) => [o.smartObjectUuid, o] as const)
    )
  )
  // Productos compatibles con el área principal (a los que se puede replicar).
  const effectiveMainAreaId =
    printAreas.length === 1 && printAreas[0].id !== "legacy"
      ? printAreas[0].id
      : mainAreaId
  const compatibleTargets = effectiveMainAreaId
    ? [
        ...new Map(
          compatLinks
            .filter((l) => l.printAreaId === effectiveMainAreaId)
            .map((l) => [l.compatibleProductId, l.compatibleProductName])
        ),
      ].map(([id, name]) => ({ id, name }))
    : []
  // Productos extra activados (con su detalle ya cargado).
  const chosenTargets = compatibleTargets.filter(
    (t) => t.id in targetState && targetProducts[t.id]
  )
  const colors = product?.colors ?? []
  const hasImages = placements.length > 0

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto p-6">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,.svg,image/svg+xml"
        className="hidden"
        onChange={handleFileSelected}
      />

      <AppHeader
        title="Nuevo diseño"
        description="Elige el producto, coloca las imágenes y genera los renders."
        leading={
          <Link
            to="/designs"
            aria-label="Volver a diseños"
            className="flex size-10 items-center justify-center rounded-full border bg-white text-neutral-600 hover:text-neutral-900"
          >
            <ArrowLeft className="size-4" />
          </Link>
        }
        actions={
          <>
            {selectedKey && (
              <Button
                data-keep-selection
                variant="outline"
                className="text-destructive hover:text-destructive"
                onClick={removeSelected}
              >
                <Trash2 className="size-4" />
                Quitar imagen
              </Button>
            )}
            <Button
              onClick={handleGenerate}
              disabled={generating || !hasImages || !productId}
            >
              {generating ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Sparkles className="size-4" />
              )}
              Generar
            </Button>
          </>
        }
      />

      {error && (
        <div
          role="alert"
          className="border-destructive/50 bg-destructive/10 text-destructive rounded-md border px-4 py-3 text-sm"
        >
          {error}
        </div>
      )}

      {/* Selector de producto (buscador autocomplete) */}
      <div className="grid max-w-md gap-2">
        <Label htmlFor="design-product">Producto</Label>
        <Combobox
          id="design-product"
          options={products.map((p) => ({ value: p.id, label: p.name }))}
          value={productId}
          onChange={handleProductChange}
          disabled={loadingProducts}
          placeholder={
            loadingProducts ? "Cargando…" : "Busca y selecciona un producto"
          }
          emptyText="No se encontraron productos."
        />
      </div>

      {/* Copyright: obligatorio, permite ocultar estos diseños de la tienda. */}
      <div className="grid max-w-md gap-2">
        <Label id="design-copyright-label">¿El diseño tiene copyright?</Label>
        <div
          role="radiogroup"
          aria-labelledby="design-copyright-label"
          className="flex gap-2"
        >
          {[
            { value: false, label: "No tiene copyright" },
            { value: true, label: "Sí tiene copyright" },
          ].map((option) => (
            <Button
              key={String(option.value)}
              data-keep-selection
              type="button"
              role="radio"
              aria-checked={hasCopyright === option.value}
              variant={hasCopyright === option.value ? "default" : "outline"}
              size="sm"
              onClick={() => setHasCopyright(option.value)}
            >
              {option.label}
            </Button>
          ))}
        </div>
        <p className="text-xs text-neutral-500">
          Permite ocultar de la tienda todos los productos con copyright si
          hiciera falta.
        </p>
      </div>

      {/* Replicar el diseño en otros productos compatibles. */}
      {product && compatLinks.length > 0 && (
        <div className="grid max-w-2xl gap-2">
          <Label id="design-compat-label">Crear también para</Label>
          {!effectiveMainAreaId ? (
            <p className="text-xs text-neutral-500">
              Marca el área principal para ver los productos compatibles.
            </p>
          ) : compatibleTargets.length === 0 ? (
            <p className="text-xs text-neutral-500">
              Ningún producto es compatible con esta área.
            </p>
          ) : (
            <div
              role="group"
              aria-labelledby="design-compat-label"
              className="flex flex-wrap gap-2"
            >
              {compatibleTargets.map((target) => {
                const on = target.id in targetState
                return (
                  <Button
                    key={target.id}
                    data-keep-selection
                    type="button"
                    size="sm"
                    variant={on ? "default" : "outline"}
                    aria-pressed={on}
                    disabled={loadingTarget === target.id}
                    onClick={() => void toggleTarget(target.id)}
                  >
                    {loadingTarget === target.id && (
                      <Loader2 className="size-4 animate-spin" />
                    )}
                    {target.name}
                  </Button>
                )
              })}
            </div>
          )}
          <p className="text-xs text-neutral-500">
            Se crea un diseño independiente por cada producto, con la imagen
            ajustada a su área compatible.
          </p>
        </div>
      )}

      {loadingProduct ? (
        <div className="flex flex-1 items-center justify-center">
          <Loader2 className="size-6 animate-spin text-neutral-400" />
        </div>
      ) : !product ? (
        <div className="flex flex-1 items-center justify-center rounded-2xl border border-dashed text-sm text-neutral-400">
          Selecciona un producto para empezar a diseñar.
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 gap-6">
          {/* Columna izquierda: colores */}
          <aside className="flex w-[320px] shrink-0 flex-col gap-4 overflow-y-auto">
            <section className="rounded-2xl border bg-white p-4">
              <h2 className="mb-1 text-sm font-semibold text-neutral-900">
                Colores a generar
                {chosenTargets.length > 0 && (
                  <span className="font-normal text-neutral-500">
                    {" "}
                    · {product.name}
                  </span>
                )}
              </h2>
              {colors.length === 0 ? (
                <p className="text-xs text-neutral-500">
                  Este producto no tiene colores configurados. Se generará un
                  render sin color. Puedes añadir colores desde el producto.
                </p>
              ) : (
                <>
                  <p className="mb-3 text-xs text-neutral-500">
                    Actívalos y arrástralos para ordenarlos. Se generará un render por cada color
                    activo.
                  </p>
                  <ColorOrderList
                    colors={colors}
                    order={colorOrder}
                    isActive={(id) => activeColorIds.has(id)}
                    onReorder={setColorOrder}
                    onToggle={toggleColor}
                  />
                </>
              )}
            </section>

            {/* Colores de cada producto compatible, elegidos por separado. */}
            {chosenTargets.map((t) => {
              const tProduct = targetProducts[t.id]
              const state = targetState[t.id]
              return (
                <section
                  key={t.id}
                  data-keep-selection
                  className="rounded-2xl border bg-white p-4"
                >
                  <h2 className="mb-1 text-sm font-semibold text-neutral-900">
                    Colores a generar
                    <span className="font-normal text-neutral-500">
                      {" "}
                      · {t.name}
                    </span>
                  </h2>
                  {tProduct.colors.length === 0 ? (
                    <p className="text-xs text-neutral-500">
                      Este producto no tiene colores configurados. Se generará
                      un render sin color.
                    </p>
                  ) : (
                    <>
                      <p className="mb-3 text-xs text-neutral-500">
                        Elige los colores de este producto y arrástralos para ordenarlos.
                      </p>
                      <ColorOrderList
                        colors={tProduct.colors}
                        order={state.order}
                        isActive={(id) => state.active.includes(id)}
                        onReorder={(order) =>
                          setTargetState((prev) =>
                            prev[t.id]
                              ? { ...prev, [t.id]: { ...prev[t.id], order } }
                              : prev
                          )
                        }
                        onToggle={(id) => toggleTargetColor(t.id, id)}
                      />
                    </>
                  )}
                </section>
              )
            })}
          </aside>

          {/* Columna derecha: áreas + canvas de edición */}
          <div className="flex min-w-0 flex-1 flex-col gap-4">
            {printAreas.length === 0 ? (
              <section className="rounded-2xl border border-dashed p-6 text-center text-sm text-neutral-500">
                Ninguna área de impresión del producto tiene una sesión con
                mockups que incluyan capas de diseño ("dise"). Ancla una sesión
                a cada área e importa mockups con smart objects de diseño para
                poder diseñar.
              </section>
            ) : (
              printAreas.map((printArea) => {
                const groupUuids = new Set(
                  printArea.objects.map((o) => o.smartObjectUuid)
                )
                const isMain =
                  printAreas.length === 1 || mainAreaId === printArea.id
                const groupHasImages = placements.some((p) =>
                  groupUuids.has(p.printAreaId)
                )
                return (
                  <section
                    key={printArea.id}
                    className="flex flex-col gap-3 rounded-2xl border bg-neutral-50 p-4"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <h2 className="text-base font-semibold text-neutral-900">
                          {printArea.name}
                        </h2>
                        <p className="text-xs text-neutral-400">
                          {printArea.objects.length}{" "}
                          {printArea.objects.length === 1
                            ? "objeto de diseño"
                            : "objetos de diseño"}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                      {printArea.id !== "legacy" && (
                        <Button
                          data-keep-selection
                          variant={isMain ? "default" : "outline"}
                          size="sm"
                          aria-pressed={isMain}
                          disabled={printAreas.length === 1}
                          onClick={() => setMainAreaId(printArea.id)}
                        >
                          <Star
                            className={
                              "size-4 " + (isMain ? "fill-current" : "")
                            }
                          />
                          {isMain ? "Área principal" : "Marcar como principal"}
                        </Button>
                      )}
                      <Button
                        data-keep-selection
                        variant="outline"
                        size="sm"
                        onClick={() => handlePreview(printArea)}
                        disabled={
                          previewingArea === printArea.id || !groupHasImages
                        }
                      >
                        {previewingArea === printArea.id ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : (
                          <Eye className="size-4" />
                        )}
                        Preview
                      </Button>
                      </div>
                    </div>
                    {printArea.objects.map((area) => {
                const areaPlacements = placements.filter(
                  (p) => p.printAreaId === area.smartObjectUuid
                )
                return (
                  <section
                    key={area.smartObjectUuid}
                    className="flex flex-col gap-2 rounded-2xl border bg-white p-4"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <h2 className="text-sm font-semibold text-neutral-900">
                          {area.name}
                        </h2>
                        <p className="text-xs text-neutral-400">
                          {area.widthPx} × {area.heightPx} px
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          data-keep-selection
                          variant="outline"
                          size="sm"
                          onClick={() => triggerUpload(area)}
                          disabled={uploadingArea === area.smartObjectUuid}
                        >
                          {uploadingArea === area.smartObjectUuid ? (
                            <Loader2 className="size-4 animate-spin" />
                          ) : (
                            <ImagePlus className="size-4" />
                          )}
                          Cargar archivo
                        </Button>
                        {areaPlacements.some((p) => p.svgText) && (
                          <Button
                            data-keep-selection
                            variant="outline"
                            size="sm"
                            onClick={() => void editSvgPlacement(area)}
                          >
                            <Pencil className="size-4" />
                            Editar diseño
                          </Button>
                        )}
                      </div>
                    </div>
                    <div data-keep-selection>
                      <AreaCanvas
                        area={area}
                        placements={areaPlacements}
                        selectedKey={selectedKey}
                        onSelect={setSelectedKey}
                        onChange={updatePlacement}
                        onReplaceAreaPlacements={(next) =>
                          replaceAreaPlacements(area.smartObjectUuid, next)
                        }
                      />
                    </div>
                  </section>
                )
                    })}
                  </section>
                )
              })
            )}

            {/* Vista previa efímera (render del primer color + SEO) */}
            {(previewUrl || previewSeo) && (
              <section className="flex flex-col gap-4 rounded-2xl border bg-white p-4">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="text-sm font-semibold text-neutral-900">
                    Vista previa
                  </h2>
                  <span className="text-xs text-neutral-400">
                    Temporal · no se guarda hasta "Generar"
                  </span>
                </div>

                {previewUrl && (
                  <div className="flex items-center justify-center overflow-hidden rounded-xl bg-neutral-100">
                    <img
                      src={previewUrl}
                      alt="Vista previa del render"
                      className="max-h-80 w-auto object-contain"
                    />
                  </div>
                )}

                {previewSeo && (
                  <div className="flex flex-col gap-3">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-xs text-neutral-400">Título</span>
                      <span className="text-sm font-medium text-neutral-900">
                        {previewSeo.title}
                      </span>
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <span className="text-xs text-neutral-400">Slug</span>
                      <span className="font-mono text-xs text-neutral-600">
                        {previewSeo.slug}
                      </span>
                    </div>
                    {previewSeo.metaDescription && (
                      <div className="flex flex-col gap-0.5">
                        <span className="text-xs text-neutral-400">
                          Meta description
                        </span>
                        <span className="text-sm text-neutral-700">
                          {previewSeo.metaDescription}
                        </span>
                      </div>
                    )}
                    <div className="flex flex-col gap-0.5">
                      <span className="text-xs text-neutral-400">
                        Descripción
                      </span>
                      <p className="text-sm leading-relaxed text-neutral-700">
                        {previewSeo.description}
                      </p>
                    </div>
                    {previewSeo.keywords.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {previewSeo.keywords.map((kw) => (
                          <span
                            key={kw}
                            className="rounded-full bg-neutral-100 px-2.5 py-0.5 text-xs text-neutral-700"
                          >
                            {kw}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </section>
            )}
          </div>
        </div>
      )}

      {/* Modal de campos de texto del SVG + gestión de fuentes faltantes. */}
      <SvgFieldsDialog
        open={svgDraft !== null}
        onOpenChange={(next) => {
          if (!next && !applyingSvg) setSvgDraft(null)
        }}
        fields={svgDraft?.fields ?? []}
        values={svgDraft?.values ?? {}}
        onValuesChange={(values) =>
          setSvgDraft((prev) => (prev ? { ...prev, values } : prev))
        }
        aligns={svgDraft?.aligns ?? {}}
        onAlignsChange={(aligns) =>
          setSvgDraft((prev) => (prev ? { ...prev, aligns } : prev))
        }
        missingFonts={svgDraft?.missingFonts ?? []}
        onUploadFont={uploadFontForFamily}
        onApply={() => {
          if (!svgDraft) return
          void applySvg(
            svgDraft.area,
            svgDraft.svg,
            svgDraft.fields,
            svgDraft.values,
            svgDraft.aligns,
            svgDraft.missingFonts
          )
        }}
        applying={applyingSvg}
      />
    </div>
  )
}

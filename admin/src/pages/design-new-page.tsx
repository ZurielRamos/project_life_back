import { useCallback, useEffect, useRef, useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import {
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Eye,
  ImagePlus,
  Loader2,
  Sparkles,
  Trash2,
} from "lucide-react"

import { ApiError } from "@/lib/api"
import {
  generateDesign,
  previewDesign,
  uploadDesignImage,
} from "@/lib/designs-api"
import { getProduct, listProducts } from "@/lib/products-api"
import { fileToDataUri } from "@/lib/file"
import type {
  DesignSeoView,
  PrintArea,
  Product,
} from "@/types/api"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { AreaCanvas, type Placement } from "@/components/designs/area-canvas"

let keyCounter = 0
function nextKey(): string {
  keyCounter += 1
  return `pl_${keyCounter}`
}

/**
 * Editor local de un diseño nuevo. No crea nada en la BD hasta pulsar
 * "Generar": compone placements (en mm) por área y los colores a renderizar,
 * y al generar crea el diseño (estado "generating") y navega a su detalle.
 */
export function DesignNewPage() {
  const navigate = useNavigate()

  const [products, setProducts] = useState<Product[]>([])
  const [loadingProducts, setLoadingProducts] = useState(true)
  const [productId, setProductId] = useState("")
  const [product, setProduct] = useState<Product | null>(null)
  const [loadingProduct, setLoadingProduct] = useState(false)

  const [placements, setPlacements] = useState<Placement[]>([])
  const [selectedKey, setSelectedKey] = useState<string | null>(null)
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
  const targetAreaRef = useRef<PrintArea | null>(null)

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
      const data = await getProduct(pid)
      setProduct(data)
      const colorIds = (data.colors ?? []).map((c) => c.id)
      setColorOrder(colorIds)
      setActiveColorIds(new Set(colorIds))
      setPlacements([])
      setSelectedKey(null)
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

  function toggleColor(colorId: string) {
    setActiveColorIds((prev) => {
      const next = new Set(prev)
      if (next.has(colorId)) next.delete(colorId)
      else next.add(colorId)
      return next
    })
  }

  function moveColor(colorId: string, delta: number) {
    setColorOrder((prev) => {
      const index = prev.indexOf(colorId)
      const target = index + delta
      if (index === -1 || target < 0 || target >= prev.length) return prev
      const next = [...prev]
      ;[next[index], next[target]] = [next[target], next[index]]
      return next
    })
  }

  function triggerUpload(area: PrintArea) {
    targetAreaRef.current = area
    fileInputRef.current?.click()
  }

  async function handleFileSelected(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const file = event.target.files?.[0]
    event.target.value = ""
    const area = targetAreaRef.current
    if (!file || !area) return

    setUploadingArea(area.id)
    setError(null)
    try {
      const dataUri = await fileToDataUri(file)
      const uploaded = await uploadDesignImage(dataUri)

      const areaW = area.widthMm ?? 100
      const areaH = area.heightMm ?? 100
      const ratio = uploaded.height / uploaded.width || 1
      let wMm = areaW * 0.6
      let hMm = wMm * ratio
      if (hMm > areaH) {
        hMm = areaH * 0.6
        wMm = hMm / ratio
      }

      const key = nextKey()
      setPlacements((prev) => [
        ...prev,
        {
          key,
          printAreaId: area.id,
          imageUrl: uploaded.url,
          imagePublicId: uploaded.publicId,
          xMm: (areaW - wMm) / 2,
          yMm: (areaH - hMm) / 2,
          widthMm: wMm,
          heightMm: hMm,
          rotation: 0,
        },
      ])
      setSelectedKey(key)
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : "No se pudo subir la imagen."
      setError(message)
    } finally {
      setUploadingArea(null)
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
  async function handlePreview(area: PrintArea) {
    if (!productId) return
    const areaPlacements = placements.filter(
      (p) => p.printAreaId === area.id
    )
    if (areaPlacements.length === 0) {
      setError("Carga una imagen en esta área antes de previsualizar.")
      return
    }
    setPreviewingArea(area.id)
    setError(null)
    try {
      const result = await previewDesign({
        productId,
        printAreaId: area.id,
        placements: areaPlacements.map((p, index) => ({
          printAreaId: p.printAreaId,
          imageUrl: p.imageUrl,
          imagePublicId: p.imagePublicId,
          xMm: p.xMm,
          yMm: p.yMm,
          widthMm: p.widthMm,
          heightMm: p.heightMm,
          rotation: p.rotation,
          zIndex: index,
        })),
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
    setGenerating(true)
    setError(null)
    try {
      await generateDesign({
        productId,
        placements: placements.map((p, index) => ({
          printAreaId: p.printAreaId,
          imageUrl: p.imageUrl,
          imagePublicId: p.imagePublicId,
          xMm: p.xMm,
          yMm: p.yMm,
          widthMm: p.widthMm,
          heightMm: p.heightMm,
          rotation: p.rotation,
          zIndex: index,
        })),
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

  const areas = product?.printAreas ?? []
  const colors = product?.colors ?? []
  const colorById = new Map(colors.map((c) => [c.id, c]))
  const hasImages = placements.length > 0

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto p-6">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileSelected}
      />

      <div>
        <Link
          to="/designs"
          className="mb-3 inline-flex items-center gap-1.5 text-sm text-neutral-500 hover:text-neutral-900"
        >
          <ArrowLeft className="size-4" />
          Volver a diseños
        </Link>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-neutral-900">
              Nuevo diseño
            </h1>
            <p className="mt-1 text-sm text-neutral-500">
              Elige el producto, coloca las imágenes y genera los renders.
            </p>
          </div>
          <div className="flex items-center gap-2">
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
          </div>
        </div>
      </div>

      {error && (
        <div
          role="alert"
          className="border-destructive/50 bg-destructive/10 text-destructive rounded-md border px-4 py-3 text-sm"
        >
          {error}
        </div>
      )}

      {/* Selector de producto */}
      <div className="grid max-w-md gap-2">
        <Label htmlFor="design-product">Producto</Label>
        <Select value={productId} onValueChange={handleProductChange}>
          <SelectTrigger id="design-product" className="w-full">
            <SelectValue
              placeholder={
                loadingProducts ? "Cargando..." : "Selecciona un producto"
              }
            />
          </SelectTrigger>
          <SelectContent>
            {products.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

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
            {colors.length > 0 && (
              <section className="rounded-2xl border bg-white p-4">
                <h2 className="mb-1 text-sm font-semibold text-neutral-900">
                  Colores a generar
                </h2>
                <p className="mb-3 text-xs text-neutral-500">
                  Actívalos y ordénalos. Se generará un render por cada color
                  activo.
                </p>
                <div className="flex flex-col gap-1.5">
                  {colorOrder.map((colorId, index) => {
                    const color = colorById.get(colorId)
                    if (!color) return null
                    const active = activeColorIds.has(color.id)
                    return (
                      <div
                        key={color.id}
                        className={
                          "flex items-center gap-2 rounded-lg border px-2 py-1.5 transition-colors " +
                          (active
                            ? "border-neutral-900 bg-neutral-50"
                            : "border-neutral-200 opacity-60")
                        }
                      >
                        <div className="flex flex-col">
                          <button
                            type="button"
                            aria-label="Subir"
                            disabled={index === 0}
                            onClick={() => moveColor(color.id, -1)}
                            className="text-neutral-400 hover:text-neutral-900 disabled:opacity-30"
                          >
                            <ChevronUp className="size-3.5" />
                          </button>
                          <button
                            type="button"
                            aria-label="Bajar"
                            disabled={index === colorOrder.length - 1}
                            onClick={() => moveColor(color.id, 1)}
                            className="text-neutral-400 hover:text-neutral-900 disabled:opacity-30"
                          >
                            <ChevronDown className="size-3.5" />
                          </button>
                        </div>

                        <button
                          type="button"
                          onClick={() => toggleColor(color.id)}
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
                  })}
                </div>
              </section>
            )}
          </aside>

          {/* Columna derecha: áreas + canvas de edición */}
          <div className="flex min-w-0 flex-1 flex-col gap-4">
            {areas.length === 0 ? (
              <section className="rounded-2xl border border-dashed p-6 text-center text-sm text-neutral-500">
                El producto no tiene áreas de impresión. Defínelas en el
                producto para poder diseñar.
              </section>
            ) : (
              areas.map((area) => {
                const areaPlacements = placements.filter(
                  (p) => p.printAreaId === area.id
                )
                return (
                  <section
                    key={area.id}
                    className="flex flex-col gap-2 rounded-2xl border bg-white p-4"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <h2 className="text-sm font-semibold text-neutral-900">
                          {area.name}
                        </h2>
                        <p className="text-xs text-neutral-400">
                          {area.widthMm && area.heightMm
                            ? `${area.widthMm} × ${area.heightMm} mm`
                            : "Sin tamaño definido"}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          data-keep-selection
                          variant="outline"
                          size="sm"
                          onClick={() => triggerUpload(area)}
                          disabled={uploadingArea === area.id}
                        >
                          {uploadingArea === area.id ? (
                            <Loader2 className="size-4 animate-spin" />
                          ) : (
                            <ImagePlus className="size-4" />
                          )}
                          Cargar imagen
                        </Button>
                        <Button
                          data-keep-selection
                          variant="outline"
                          size="sm"
                          onClick={() => handlePreview(area)}
                          disabled={
                            previewingArea === area.id ||
                            areaPlacements.length === 0
                          }
                        >
                          {previewingArea === area.id ? (
                            <Loader2 className="size-4 animate-spin" />
                          ) : (
                            <Eye className="size-4" />
                          )}
                          Preview
                        </Button>
                      </div>
                    </div>
                    <div data-keep-selection>
                      <AreaCanvas
                        area={area}
                        placements={areaPlacements}
                        selectedKey={selectedKey}
                        onSelect={setSelectedKey}
                        onChange={updatePlacement}
                      />
                    </div>
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
    </div>
  )
}

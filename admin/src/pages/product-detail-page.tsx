import { useCallback, useEffect, useState } from "react"
import { Link, useNavigate, useParams } from "react-router-dom"
import {
  ArrowLeft,
  Images,
  Loader2,
  Pencil,
  Plus,
  Ruler,
  Trash2,
} from "lucide-react"

import { ApiError } from "@/lib/api"
import {
  deleteProduct,
  getProduct,
  removeSessionMockup,
} from "@/lib/products-api"
import type { PhotoSession, Product, ProductFit } from "@/types/api"
import { Button } from "@/components/ui/button"
import { AddSessionDialog } from "@/components/products/add-session-dialog"
import { EditAttributesDialog } from "@/components/products/edit-attributes-dialog"
import { EditColorsDialog } from "@/components/products/edit-colors-dialog"
import { EditPrintAreasDialog } from "@/components/products/edit-print-areas-dialog"
import { EditSizesDialog } from "@/components/products/edit-sizes-dialog"
import { ImportSessionMockupsDialog } from "@/components/products/import-session-mockups-dialog"

const FIT_LABELS: Record<ProductFit, string> = {
  men: "Hombre",
  women: "Mujer",
  unisex: "Unisex",
  kids: "Niños",
  family: "Familiar",
}

function formatPrice(cents: number | null, currency: string | null): string {
  if (cents == null) return "—"
  const amount = (cents / 100).toFixed(2)
  return currency ? `${amount} ${currency}` : amount
}

/** Fila etiqueta/valor para la ficha de atributos. */
function Field({ label, value }: { label: string; value: string | null }) {
  if (!value) return null
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-neutral-400">{label}</span>
      <span className="text-sm text-neutral-900">{value}</span>
    </div>
  )
}

export function ProductDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [product, setProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [addSessionOpen, setAddSessionOpen] = useState(false)
  const [importForSession, setImportForSession] = useState<string | null>(null)
  const [editAttributesOpen, setEditAttributesOpen] = useState(false)
  const [editSizesOpen, setEditSizesOpen] = useState(false)
  const [editColorsOpen, setEditColorsOpen] = useState(false)
  const [editPrintAreasOpen, setEditPrintAreasOpen] = useState(false)

  const load = useCallback(async () => {
    if (!id) return
    setLoading(true)
    setError(null)
    try {
      const data = await getProduct(id)
      setProduct(data)
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : "No se pudo cargar el producto."
      setError(message)
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    void load()
  }, [load])

  const upsertSession = useCallback((session: PhotoSession) => {
    setProduct((prev) => {
      if (!prev) return prev
      const exists = prev.photoSessions.some((s) => s.id === session.id)
      const photoSessions = exists
        ? prev.photoSessions.map((s) => (s.id === session.id ? session : s))
        : [...prev.photoSessions, session]
      return { ...prev, photoSessions }
    })
  }, [])

  async function handleRemoveMockup(sessionId: string, mockupId: string) {
    if (!id) return
    try {
      const session = await removeSessionMockup(id, sessionId, mockupId)
      upsertSession(session)
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : "No se pudo quitar el mockup."
      setError(message)
    }
  }

  async function handleDeleteProduct() {
    if (!id || !product) return
    const ok = window.confirm(
      `¿Eliminar el producto "${product.name}"? Esta acción no se puede deshacer.`
    )
    if (!ok) return
    try {
      await deleteProduct(id)
      navigate("/products")
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : "No se pudo eliminar el producto."
      setError(message)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center">
        <Loader2 className="size-6 animate-spin text-neutral-400" />
      </div>
    )
  }

  if (error || !product) {
    return (
      <div className="flex min-h-0 flex-1 flex-col gap-4 p-6">
        <Link
          to="/products"
          className="inline-flex items-center gap-1.5 text-sm text-neutral-500 hover:text-neutral-900"
        >
          <ArrowLeft className="size-4" />
          Volver a productos
        </Link>
        <div
          role="alert"
          className="border-destructive/50 bg-destructive/10 text-destructive rounded-md border px-4 py-3 text-sm"
        >
          {error ?? "Producto no encontrado."}
        </div>
      </div>
    )
  }

  const { modelInfo } = product

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto p-6">
      {/* Encabezado */}
      <div>
        <Link
          to="/products"
          className="mb-3 inline-flex items-center gap-1.5 text-sm text-neutral-500 hover:text-neutral-900"
        >
          <ArrowLeft className="size-4" />
          Volver a productos
        </Link>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-neutral-900">
              {product.name}
            </h1>
            {product.description && (
              <p className="mt-1 max-w-2xl text-sm text-neutral-500">
                {product.description}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              className="text-destructive hover:text-destructive"
              onClick={handleDeleteProduct}
            >
              <Trash2 className="size-4" />
              Eliminar
            </Button>
          </div>
        </div>
      </div>

      {/* Detalles / atributos */}
      <section className="rounded-2xl border bg-white p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold text-neutral-900">Detalles</h2>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setEditAttributesOpen(true)}
          >
            <Pencil className="size-4" />
            Editar
          </Button>
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          <Field label="Marca" value={product.brand} />
          <Field label="Categoría" value={product.category} />
          <Field
            label="Ajuste"
            value={product.fit ? FIT_LABELS[product.fit] : null}
          />
          <Field
            label="Precio"
            value={
              product.basePriceCents != null
                ? formatPrice(product.basePriceCents, product.currency)
                : null
            }
          />
          <Field label="Composición" value={product.composition} />
          <Field label="Cuidado" value={product.careInstructions} />
        </div>
        {modelInfo &&
          (modelInfo.label ||
            modelInfo.heightCm ||
            modelInfo.weightKg ||
            modelInfo.wearingSize) && (
            <div className="mt-4 border-t pt-3">
              <span className="text-xs text-neutral-400">
                Información del modelo
              </span>
              <p className="mt-1 text-sm text-neutral-700">
                {[
                  modelInfo.label,
                  modelInfo.heightCm ? `Altura ${modelInfo.heightCm} cm` : null,
                  modelInfo.weightKg ? `Peso ${modelInfo.weightKg} kg` : null,
                  modelInfo.wearingSize ? `Talla ${modelInfo.wearingSize}` : null,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            </div>
          )}
      </section>

      {/* Size chart */}
      <section className="rounded-2xl border bg-white p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="flex items-center gap-2 font-semibold text-neutral-900">
            <Ruler className="size-4 text-neutral-400" />
            Tallas y size chart
          </h2>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setEditSizesOpen(true)}
          >
            <Pencil className="size-4" />
            Editar
          </Button>
        </div>
        {product.sizes.length === 0 ? (
          <p className="text-sm text-neutral-400">
            Sin tallas definidas.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b text-left text-xs text-neutral-500">
                  <th className="p-2 font-medium">Talla</th>
                  <th className="p-2 font-medium">Etiqueta</th>
                  {product.sizeChartColumns.map((col) => (
                    <th key={col} className="p-2 font-medium">
                      {col} ({product.sizeChartUnit})
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {product.sizes.map((size) => (
                  <tr key={size.id} className="border-b last:border-0">
                    <td className="p-2 font-medium text-neutral-900">
                      {size.name}
                    </td>
                    <td className="p-2 text-neutral-600">
                      {size.labelName ?? "—"}
                    </td>
                    {product.sizeChartColumns.map((col) => (
                      <td key={col} className="p-2 text-neutral-600">
                        {size.measurements[col] ?? "—"}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Colores */}
      <section className="rounded-2xl border bg-white p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold text-neutral-900">Colores</h2>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setEditColorsOpen(true)}
          >
            <Pencil className="size-4" />
            Editar
          </Button>
        </div>
        {product.colors.length === 0 ? (
          <p className="text-sm text-neutral-400">Sin colores definidos.</p>
        ) : (
          <div className="flex flex-wrap gap-3">
            {product.colors.map((color) => (
              <div key={color.id} className="flex items-center gap-2">
                <span
                  className="size-6 rounded-full border"
                  style={{ backgroundColor: color.hex }}
                  title={color.hex}
                />
                <span className="text-sm text-neutral-700">{color.name}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Áreas de impresión */}
      <section className="rounded-2xl border bg-white p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold text-neutral-900">
            Áreas de impresión
          </h2>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setEditPrintAreasOpen(true)}
          >
            <Pencil className="size-4" />
            Editar
          </Button>
        </div>
        {product.printAreas.length === 0 ? (
          <p className="text-sm text-neutral-400">
            Sin áreas de impresión definidas.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {product.printAreas.map((area) => (
              <div
                key={area.id}
                className="rounded-xl border p-3"
              >
                <p className="text-sm font-medium text-neutral-900">
                  {area.name}
                </p>
                <p className="mt-1 text-xs text-neutral-500">
                  {area.widthMm && area.heightMm
                    ? `${area.widthMm} × ${area.heightMm} mm`
                    : "Sin tamaño"}
                </p>
                {area.technique && (
                  <p className="mt-0.5 text-xs text-neutral-400">
                    {area.technique}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Sesiones */}
      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-neutral-900">Sesiones de fotos</h2>
          <Button size="sm" onClick={() => setAddSessionOpen(true)}>
            <Plus className="size-4" />
            Nueva sesión
          </Button>
        </div>
        {product.photoSessions.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed py-10 text-center text-neutral-500">
            <Images className="size-10 text-neutral-300" />
            <p className="text-sm">Este producto no tiene sesiones de fotos.</p>
            <Button variant="outline" onClick={() => setAddSessionOpen(true)}>
              <Plus className="size-4" />
              Añadir sesión
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            {product.photoSessions.map((session) => (
              <div key={session.id} className="rounded-2xl border bg-white p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-neutral-900">
                        {session.name}
                      </h3>
                      {session.printArea && (
                        <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-neutral-600">
                          {session.printArea.name}
                        </span>
                      )}
                    </div>
                    {session.description && (
                      <p className="text-sm text-neutral-500">
                        {session.description}
                      </p>
                    )}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setImportForSession(session.id)}
                  >
                    <Plus className="size-4" />
                    Importar mockups
                  </Button>
                </div>

                {!session.mockups || session.mockups.length === 0 ? (
                  <p className="mt-4 text-sm text-neutral-400">
                    Sin mockups. Importa plantillas de SudoMock.
                  </p>
                ) : (
                  <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                    {session.mockups.map((item) => (
                      <div
                        key={item.id}
                        className="group relative flex flex-col overflow-hidden rounded-xl border bg-white"
                      >
                        <button
                          type="button"
                          aria-label="Quitar mockup"
                          onClick={() => handleRemoveMockup(session.id, item.id)}
                          className="absolute right-1.5 top-1.5 z-10 flex size-6 items-center justify-center rounded-full bg-red-500 text-white opacity-0 transition-opacity hover:bg-red-600 group-hover:opacity-100"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                        <div className="flex aspect-[4/3] items-center justify-center bg-neutral-100">
                          {item.thumbnailUrl ? (
                            <img
                              src={item.thumbnailUrl}
                              alt={item.sudomockName ?? "Mockup"}
                              className="size-full object-cover"
                            />
                          ) : (
                            <Images className="size-8 text-neutral-300" />
                          )}
                        </div>
                        <p
                          title={item.sudomockName ?? undefined}
                          className="truncate p-2 text-xs font-medium text-neutral-900"
                        >
                          {item.sudomockName ?? "Sin nombre"}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Diálogos */}
      <EditAttributesDialog
        product={product}
        open={editAttributesOpen}
        onOpenChange={setEditAttributesOpen}
        onSaved={setProduct}
      />
      <EditSizesDialog
        product={product}
        open={editSizesOpen}
        onOpenChange={setEditSizesOpen}
        onSaved={setProduct}
      />
      <EditColorsDialog
        product={product}
        open={editColorsOpen}
        onOpenChange={setEditColorsOpen}
        onSaved={setProduct}
      />
      <EditPrintAreasDialog
        product={product}
        open={editPrintAreasOpen}
        onOpenChange={setEditPrintAreasOpen}
        onSaved={setProduct}
      />
      <AddSessionDialog
        productId={product.id}
        printAreas={product.printAreas}
        open={addSessionOpen}
        onOpenChange={setAddSessionOpen}
        onAdded={upsertSession}
      />
      {importForSession && (
        <ImportSessionMockupsDialog
          productId={product.id}
          sessionId={importForSession}
          open={importForSession !== null}
          onOpenChange={(next) => {
            if (!next) setImportForSession(null)
          }}
          onImported={upsertSession}
        />
      )}
    </div>
  )
}

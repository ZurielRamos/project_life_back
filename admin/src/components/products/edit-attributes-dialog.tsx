import { useEffect, useState, type FormEvent } from "react"
import { Loader2, Plus, Trash2 } from "lucide-react"

import { ApiError } from "@/lib/api"
import {
  createFitCategory,
  deleteFitCategory,
  listFitCategories,
} from "@/lib/fit-categories-api"
import { updateProduct } from "@/lib/products-api"
import type {
  FitCategory,
  Product,
  ProductFit,
  UpdateProductPayload,
} from "@/types/api"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

const FIT_NONE = "none"
const CATEGORY_NONE = "none"

const FIT_OPTIONS: { value: ProductFit; label: string }[] = [
  { value: "men", label: "Hombre" },
  { value: "women", label: "Mujer" },
  { value: "unisex", label: "Unisex" },
  { value: "kids", label: "Niños" },
  { value: "family", label: "Familiar" },
]

interface EditAttributesDialogProps {
  product: Product
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved: (product: Product) => void
}

export function EditAttributesDialog({
  product,
  open,
  onOpenChange,
  onSaved,
}: EditAttributesDialogProps) {
  const [brand, setBrand] = useState(product.brand ?? "")
  const [category, setCategory] = useState(product.category ?? "")
  const [composition, setComposition] = useState(product.composition ?? "")
  const [careInstructions, setCareInstructions] = useState(
    product.careInstructions ?? ""
  )
  const [fit, setFit] = useState<ProductFit | "">(product.fit ?? "")
  // Categoría del ajuste elegida para el producto.
  const [fitCategoryId, setFitCategoryId] = useState<string | "">(
    product.fitCategoryId ?? ""
  )
  // Categorías del ajuste seleccionado (administrables desde el selector).
  const [fitCategories, setFitCategories] = useState<FitCategory[]>([])
  const [catLoading, setCatLoading] = useState(false)
  const [catError, setCatError] = useState<string | null>(null)
  const [newCatName, setNewCatName] = useState("")
  const [addingCat, setAddingCat] = useState(false)
  const [deletingCatId, setDeletingCatId] = useState<string | null>(null)
  const [price, setPrice] = useState(
    product.basePriceCents != null
      ? (product.basePriceCents / 100).toString()
      : ""
  )
  const [currency, setCurrency] = useState(product.currency ?? "")
  // Model info
  const [modelLabel, setModelLabel] = useState(product.modelInfo?.label ?? "")
  const [modelHeight, setModelHeight] = useState(
    product.modelInfo?.heightCm?.toString() ?? ""
  )
  const [modelWeight, setModelWeight] = useState(
    product.modelInfo?.weightKg?.toString() ?? ""
  )
  const [modelSize, setModelSize] = useState(
    product.modelInfo?.wearingSize ?? ""
  )

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Carga las categorías del ajuste seleccionado. Se re-ejecuta al abrir el
  // diálogo o al cambiar el ajuste. Sin ajuste no hay categorías que mostrar.
  useEffect(() => {
    if (!open) return
    if (!fit) {
      setFitCategories([])
      return
    }
    let active = true
    setCatLoading(true)
    setCatError(null)
    listFitCategories(fit)
      .then((categories) => {
        if (active) setFitCategories(categories)
      })
      .catch((err) => {
        if (!active) return
        setCatError(
          err instanceof ApiError
            ? err.message
            : "No se pudieron cargar las categorías."
        )
      })
      .finally(() => {
        if (active) setCatLoading(false)
      })
    return () => {
      active = false
    }
  }, [open, fit])

  function handleFitChange(value: string) {
    const nextFit = value === FIT_NONE ? "" : (value as ProductFit)
    setFit(nextFit)
    // La categoría pertenece a un ajuste; al cambiarlo se reinicia.
    setFitCategoryId("")
    setCatError(null)
    setNewCatName("")
  }

  async function handleAddCategory() {
    const name = newCatName.trim()
    if (!name || !fit) return
    setAddingCat(true)
    setCatError(null)
    try {
      const created = await createFitCategory({ fit, name })
      setFitCategories((prev) =>
        [...prev, created].sort((a, b) => a.position - b.position)
      )
      setFitCategoryId(created.id)
      setNewCatName("")
    } catch (err) {
      setCatError(
        err instanceof ApiError
          ? err.message
          : "No se pudo crear la categoría."
      )
    } finally {
      setAddingCat(false)
    }
  }

  async function handleDeleteCategory(cat: FitCategory) {
    setDeletingCatId(cat.id)
    setCatError(null)
    try {
      await deleteFitCategory(cat.id)
      setFitCategories((prev) => prev.filter((c) => c.id !== cat.id))
      // Si el producto usaba la categoría eliminada, limpia la selección.
      setFitCategoryId((current) => (current === cat.id ? "" : current))
    } catch (err) {
      setCatError(
        err instanceof ApiError
          ? err.message
          : "No se pudo eliminar la categoría."
      )
    } finally {
      setDeletingCatId(null)
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setSaving(true)

    const payload: UpdateProductPayload = {
      brand: brand.trim(),
      category: category.trim(),
      composition: composition.trim(),
      careInstructions: careInstructions.trim(),
      ...(fit ? { fit } : {}),
      // La categoría se envía solo si hay un ajuste; null la limpia.
      fitCategoryId: fit && fitCategoryId ? fitCategoryId : null,
      currency: currency.trim().toUpperCase(),
      modelInfo: {
        label: modelLabel.trim() || null,
        heightCm: modelHeight ? Number(modelHeight) : null,
        weightKg: modelWeight ? Number(modelWeight) : null,
        wearingSize: modelSize.trim() || null,
      },
    }
    const priceNum = Number(price)
    if (price !== "" && !Number.isNaN(priceNum)) {
      payload.basePriceCents = Math.round(priceNum * 100)
    }

    try {
      const updated = await updateProduct(product.id, payload)
      onSaved(updated)
      onOpenChange(false)
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : "No se pudieron guardar los atributos."
      setError(message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Editar detalles del producto</DialogTitle>
          <DialogDescription>
            Atributos de catálogo e información del modelo.
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={handleSubmit}
          className="flex max-h-[65vh] flex-col gap-4 overflow-y-auto"
        >
          {error && (
            <div
              role="alert"
              className="border-destructive/50 bg-destructive/10 text-destructive rounded-md border px-3 py-2 text-sm"
            >
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="brand">Marca</Label>
              <Input
                id="brand"
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                maxLength={120}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="category">Categoría</Label>
              <Input
                id="category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                maxLength={120}
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="composition">Composición</Label>
            <Input
              id="composition"
              value={composition}
              onChange={(e) => setComposition(e.target.value)}
              placeholder="100% algodón"
              maxLength={500}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="care">Instrucciones de cuidado</Label>
            <textarea
              id="care"
              value={careInstructions}
              onChange={(e) => setCareInstructions(e.target.value)}
              rows={2}
              maxLength={1000}
              className="border-input focus-visible:border-ring focus-visible:ring-ring/50 w-full resize-none rounded-md border bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:ring-[3px]"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="fit">Ajuste</Label>
              <Select
                value={fit === "" ? FIT_NONE : fit}
                onValueChange={handleFitChange}
              >
                <SelectTrigger id="fit" className="w-full">
                  <SelectValue placeholder="—" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={FIT_NONE}>—</SelectItem>
                  {FIT_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="fit-category">Categoría de ajuste</Label>
              <Select
                value={fitCategoryId === "" ? CATEGORY_NONE : fitCategoryId}
                onValueChange={(value) =>
                  setFitCategoryId(value === CATEGORY_NONE ? "" : value)
                }
                disabled={!fit || catLoading}
              >
                <SelectTrigger id="fit-category" className="w-full">
                  <SelectValue
                    placeholder={fit ? "—" : "Elige un ajuste primero"}
                  />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={CATEGORY_NONE}>—</SelectItem>
                  {fitCategories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Gestión de categorías del ajuste seleccionado (fuera del Select
              para que los clics de agregar/eliminar sean fiables). */}
          {fit && (
            <div className="grid gap-2 rounded-md border bg-neutral-50 p-3">
              <p className="text-xs font-medium text-neutral-700">
                Categorías de este ajuste
              </p>

              <div className="flex items-center gap-2">
                <Input
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  placeholder="Nueva categoría"
                  className="h-8 text-sm"
                  maxLength={60}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault()
                      void handleAddCategory()
                    }
                  }}
                />
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-8 shrink-0"
                  disabled={addingCat || !newCatName.trim()}
                  onClick={() => void handleAddCategory()}
                >
                  {addingCat ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Plus className="size-4" />
                  )}
                  Agregar
                </Button>
              </div>

              {catLoading ? (
                <p className="text-muted-foreground text-xs">Cargando…</p>
              ) : fitCategories.length === 0 ? (
                <p className="text-muted-foreground text-xs">
                  Aún no hay categorías para este ajuste.
                </p>
              ) : (
                <ul className="flex flex-wrap gap-2">
                  {fitCategories.map((c) => (
                    <li
                      key={c.id}
                      className="flex items-center gap-1 rounded-full border bg-white py-1 pr-1 pl-3 text-sm"
                    >
                      <span>{c.name}</span>
                      <button
                        type="button"
                        title={`Eliminar "${c.name}"`}
                        aria-label={`Eliminar categoría ${c.name}`}
                        className="text-muted-foreground hover:text-destructive flex size-6 shrink-0 items-center justify-center rounded-full disabled:opacity-50"
                        disabled={deletingCatId === c.id}
                        onClick={() => void handleDeleteCategory(c)}
                      >
                        {deletingCatId === c.id ? (
                          <Loader2 className="size-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="size-3.5" />
                        )}
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              {catError && (
                <p className="text-destructive text-xs">{catError}</p>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="price">Precio</Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                min="0"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="currency">Moneda</Label>
              <Input
                id="currency"
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                placeholder="USD"
                maxLength={3}
              />
            </div>
          </div>

          <div className="border-t pt-4">
            <p className="mb-3 text-sm font-medium text-neutral-900">
              Información del modelo
            </p>
            <div className="grid grid-cols-4 gap-3">
              <div className="grid gap-2">
                <Label htmlFor="model-label">Etiqueta</Label>
                <Input
                  id="model-label"
                  value={modelLabel}
                  onChange={(e) => setModelLabel(e.target.value)}
                  placeholder="Man"
                  maxLength={120}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="model-height">Altura (cm)</Label>
                <Input
                  id="model-height"
                  type="number"
                  min="0"
                  value={modelHeight}
                  onChange={(e) => setModelHeight(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="model-weight">Peso (kg)</Label>
                <Input
                  id="model-weight"
                  type="number"
                  min="0"
                  value={modelWeight}
                  onChange={(e) => setModelWeight(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="model-size">Talla</Label>
                <Input
                  id="model-size"
                  value={modelSize}
                  onChange={(e) => setModelSize(e.target.value)}
                  placeholder="L"
                  maxLength={20}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="size-4 animate-spin" />}
              Guardar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

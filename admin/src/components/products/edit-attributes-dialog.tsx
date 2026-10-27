import { useState, type FormEvent } from "react"
import { Loader2 } from "lucide-react"

import { ApiError } from "@/lib/api"
import { updateProduct } from "@/lib/products-api"
import type { Product, ProductFit, UpdateProductPayload } from "@/types/api"
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

interface EditAttributesDialogProps {
  product: Product
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved: (product: Product) => void
}

const FIT_OPTIONS: { value: ProductFit; label: string }[] = [
  { value: "men", label: "Hombre" },
  { value: "women", label: "Mujer" },
  { value: "unisex", label: "Unisex" },
  { value: "kids", label: "Niños" },
  { value: "family", label: "Familiar" },
]

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

          <div className="grid grid-cols-3 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="fit">Ajuste</Label>
              <Select
                value={fit === "" ? FIT_NONE : fit}
                onValueChange={(value) =>
                  setFit(value === FIT_NONE ? "" : (value as ProductFit))
                }
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

import { useEffect, useState } from "react"
import { Download, Loader2, Plus, Trash2 } from "lucide-react"

import { ApiError } from "@/lib/api"
import { getProduct, listProducts, setProductColors } from "@/lib/products-api"
import type { Product, ProductSummary } from "@/types/api"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Combobox } from "@/components/ui/combobox"
import { Input } from "@/components/ui/input"

interface EditColorsDialogProps {
  product: Product
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved: (product: Product) => void
}

interface ColorRow {
  name: string
  hex: string
}

const DEFAULT_HEX = "#000000"

export function EditColorsDialog({
  product,
  open,
  onOpenChange,
  onSaved,
}: EditColorsDialogProps) {
  const [rows, setRows] = useState<ColorRow[]>(
    product.colors.map((c) => ({ name: c.name, hex: c.hex }))
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Importar colores de otro producto (reemplaza los actuales en el formulario).
  const [others, setOthers] = useState<ProductSummary[]>([])
  const [sourceId, setSourceId] = useState("")
  const [importing, setImporting] = useState(false)

  useEffect(() => {
    if (!open) return
    let active = true
    listProducts()
      .then((list) => {
        if (active) setOthers(list.filter((p) => p.id !== product.id))
      })
      .catch(() => {
        /* silencioso: la importación es opcional */
      })
    return () => {
      active = false
    }
  }, [open, product.id])

  async function handleImport() {
    if (!sourceId) return
    setError(null)
    setImporting(true)
    try {
      const source = await getProduct(sourceId)
      if (source.colors.length === 0) {
        setError("Ese producto no tiene colores para importar.")
        return
      }
      // Reemplaza todos los colores actuales; se guarda al pulsar "Guardar".
      setRows(source.colors.map((c) => ({ name: c.name, hex: c.hex })))
      setSourceId("")
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "No se pudieron importar los colores."
      )
    } finally {
      setImporting(false)
    }
  }

  function addRow() {
    setRows((prev) => [...prev, { name: "", hex: DEFAULT_HEX }])
  }

  function removeRow(index: number) {
    setRows((prev) => prev.filter((_, i) => i !== index))
  }

  function updateRow(index: number, patch: Partial<ColorRow>) {
    setRows((prev) =>
      prev.map((r, i) => (i === index ? { ...r, ...patch } : r))
    )
  }

  async function handleSave() {
    setError(null)
    setSaving(true)
    try {
      const updated = await setProductColors(product.id, {
        colors: rows
          .filter((r) => r.name.trim())
          .map((r) => ({ name: r.name.trim(), hex: r.hex })),
      })
      onSaved(updated)
      onOpenChange(false)
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : "No se pudieron guardar los colores."
      setError(message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Colores del producto</DialogTitle>
          <DialogDescription>
            Define los colores disponibles con su nombre y muestra.
          </DialogDescription>
        </DialogHeader>

        <div className="flex max-h-[60vh] flex-col gap-3 overflow-y-auto">
          {error && (
            <div
              role="alert"
              className="border-destructive/50 bg-destructive/10 text-destructive rounded-md border px-3 py-2 text-sm"
            >
              {error}
            </div>
          )}

          {others.length > 0 && (
            <div className="flex flex-col gap-2 rounded-xl border bg-neutral-50 p-3">
              <p className="text-xs font-medium text-neutral-700">
                Importar de otro producto
              </p>
              <div className="flex items-center gap-2">
                <div className="min-w-0 flex-1">
                  <Combobox
                    options={others.map((p) => ({
                      value: p.id,
                      label: p.name,
                    }))}
                    value={sourceId}
                    onChange={setSourceId}
                    placeholder="Busca un producto"
                    emptyText="No se encontraron productos."
                  />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleImport}
                  disabled={!sourceId || importing}
                >
                  {importing ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Download className="size-4" />
                  )}
                  Importar
                </Button>
              </div>
              <p className="text-xs text-neutral-500">
                Reemplaza todos los colores actuales. Se aplica al pulsar
                Guardar.
              </p>
            </div>
          )}

          {rows.length === 0 ? (
            <p className="text-sm text-neutral-400">
              Aún no hay colores. Añade el primero.
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {rows.map((row, index) => (
                <div key={index} className="flex items-center gap-2">
                  {/* Selector de color nativo (input color, no un select) */}
                  <label
                    className="relative size-9 shrink-0 cursor-pointer overflow-hidden rounded-md border"
                    style={{ backgroundColor: row.hex }}
                    title="Elegir color"
                  >
                    <input
                      type="color"
                      value={row.hex}
                      onChange={(e) =>
                        updateRow(index, { hex: e.target.value })
                      }
                      className="absolute inset-0 cursor-pointer opacity-0"
                      aria-label="Elegir color"
                    />
                  </label>
                  <Input
                    value={row.name}
                    onChange={(e) =>
                      updateRow(index, { name: e.target.value })
                    }
                    placeholder="Nombre del color (p.ej. Negro)"
                    maxLength={80}
                    className="flex-1"
                  />
                  <Input
                    value={row.hex}
                    onChange={(e) =>
                      updateRow(index, { hex: e.target.value })
                    }
                    placeholder="#000000"
                    maxLength={9}
                    className="w-28 font-mono text-xs"
                  />
                  <button
                    type="button"
                    onClick={() => removeRow(index)}
                    aria-label="Quitar color"
                    className="text-neutral-400 hover:text-red-500"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addRow}
            className="self-start"
          >
            <Plus className="size-4" />
            Añadir color
          </Button>
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
          <Button type="button" onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="size-4 animate-spin" />}
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

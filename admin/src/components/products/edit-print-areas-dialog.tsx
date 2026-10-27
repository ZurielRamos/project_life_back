import { useState } from "react"
import { Loader2, Plus, Trash2 } from "lucide-react"

import { ApiError } from "@/lib/api"
import { setProductPrintAreas } from "@/lib/products-api"
import { PRINT_TECHNIQUES } from "@/data/print-techniques"
import type { Product } from "@/types/api"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

const TECHNIQUE_NONE = "none"

interface EditPrintAreasDialogProps {
  product: Product
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved: (product: Product) => void
}

interface AreaRow {
  name: string
  widthMm: string
  heightMm: string
  technique: string
}

export function EditPrintAreasDialog({
  product,
  open,
  onOpenChange,
  onSaved,
}: EditPrintAreasDialogProps) {
  const [rows, setRows] = useState<AreaRow[]>(
    product.printAreas.map((a) => ({
      name: a.name,
      widthMm: a.widthMm?.toString() ?? "",
      heightMm: a.heightMm?.toString() ?? "",
      technique: a.technique ?? "",
    }))
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function addRow() {
    setRows((prev) => [
      ...prev,
      { name: "", widthMm: "", heightMm: "", technique: "" },
    ])
  }

  function removeRow(index: number) {
    setRows((prev) => prev.filter((_, i) => i !== index))
  }

  function updateRow(index: number, patch: Partial<AreaRow>) {
    setRows((prev) =>
      prev.map((r, i) => (i === index ? { ...r, ...patch } : r))
    )
  }

  async function handleSave() {
    setError(null)
    setSaving(true)
    try {
      const updated = await setProductPrintAreas(product.id, {
        printAreas: rows
          .filter((r) => r.name.trim())
          .map((r) => ({
            name: r.name.trim(),
            widthMm: r.widthMm ? Number(r.widthMm) : undefined,
            heightMm: r.heightMm ? Number(r.heightMm) : undefined,
            technique: r.technique.trim() || undefined,
          })),
      })
      onSaved(updated)
      onOpenChange(false)
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : "No se pudieron guardar las áreas de impresión."
      setError(message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Áreas de impresión</DialogTitle>
          <DialogDescription>
            Define las zonas imprimibles y su tamaño físico (en milímetros).
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

          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b text-left text-xs text-neutral-500">
                <th className="p-2 font-medium">Nombre</th>
                <th className="p-2 font-medium">Ancho (mm)</th>
                <th className="p-2 font-medium">Alto (mm)</th>
                <th className="p-2 font-medium">Técnica</th>
                <th className="w-8 p-2" />
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr key={index} className="border-b">
                  <td className="p-1.5">
                    <Input
                      value={row.name}
                      onChange={(e) =>
                        updateRow(index, { name: e.target.value })
                      }
                      placeholder="Pecho"
                      className="h-8"
                    />
                  </td>
                  <td className="p-1.5">
                    <Input
                      type="number"
                      min="0"
                      value={row.widthMm}
                      onChange={(e) =>
                        updateRow(index, { widthMm: e.target.value })
                      }
                      className="h-8 w-24"
                    />
                  </td>
                  <td className="p-1.5">
                    <Input
                      type="number"
                      min="0"
                      value={row.heightMm}
                      onChange={(e) =>
                        updateRow(index, { heightMm: e.target.value })
                      }
                      className="h-8 w-24"
                    />
                  </td>
                  <td className="p-1.5">
                    <Select
                      value={row.technique || TECHNIQUE_NONE}
                      onValueChange={(value) =>
                        updateRow(index, {
                          technique: value === TECHNIQUE_NONE ? "" : value,
                        })
                      }
                    >
                      <SelectTrigger size="sm" className="w-44">
                        <SelectValue placeholder="Técnica" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={TECHNIQUE_NONE}>—</SelectItem>
                        {PRINT_TECHNIQUES.map((t) => (
                          <SelectItem key={t.value} value={t.value}>
                            {t.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="p-1.5">
                    <button
                      type="button"
                      onClick={() => removeRow(index)}
                      aria-label="Quitar área"
                      className="text-neutral-400 hover:text-red-500"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addRow}
            className="self-start"
          >
            <Plus className="size-4" />
            Añadir área
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

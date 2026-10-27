import { useState } from "react"
import { Loader2, Plus, Trash2, X } from "lucide-react"

import { ApiError } from "@/lib/api"
import { setProductSizes, updateProduct } from "@/lib/products-api"
import type { MeasurementUnit, Product } from "@/types/api"
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

interface EditSizesDialogProps {
  product: Product
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved: (product: Product) => void
}

interface SizeRow {
  name: string
  labelName: string
  measurements: Record<string, string>
}

export function EditSizesDialog({
  product,
  open,
  onOpenChange,
  onSaved,
}: EditSizesDialogProps) {
  const [unit, setUnit] = useState<MeasurementUnit>(product.sizeChartUnit)
  const [columns, setColumns] = useState<string[]>(product.sizeChartColumns)
  const [rows, setRows] = useState<SizeRow[]>(
    product.sizes.map((s) => ({
      name: s.name,
      labelName: s.labelName ?? "",
      measurements: Object.fromEntries(
        Object.entries(s.measurements).map(([k, v]) => [k, String(v)])
      ),
    }))
  )
  const [newColumn, setNewColumn] = useState("")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function addRow() {
    setRows((prev) => [...prev, { name: "", labelName: "", measurements: {} }])
  }

  function removeRow(index: number) {
    setRows((prev) => prev.filter((_, i) => i !== index))
  }

  function updateRow(index: number, patch: Partial<SizeRow>) {
    setRows((prev) =>
      prev.map((r, i) => (i === index ? { ...r, ...patch } : r))
    )
  }

  function setMeasurement(index: number, col: string, value: string) {
    setRows((prev) =>
      prev.map((r, i) =>
        i === index
          ? { ...r, measurements: { ...r.measurements, [col]: value } }
          : r
      )
    )
  }

  function addColumn() {
    const col = newColumn.trim()
    if (!col || columns.includes(col)) return
    setColumns((prev) => [...prev, col])
    setNewColumn("")
  }

  function removeColumn(col: string) {
    setColumns((prev) => prev.filter((c) => c !== col))
    setRows((prev) =>
      prev.map((r) => {
        const { [col]: _removed, ...rest } = r.measurements
        return { ...r, measurements: rest }
      })
    )
  }

  async function handleSave() {
    setError(null)
    setSaving(true)
    try {
      // 1) Guarda unidad y columnas del size chart en el producto.
      await updateProduct(product.id, {
        sizeChartUnit: unit,
        sizeChartColumns: columns,
      })
      // 2) Reemplaza las tallas con sus medidas.
      const updated = await setProductSizes(product.id, {
        sizes: rows
          .filter((r) => r.name.trim())
          .map((r) => {
            const measurements: Record<string, number> = {}
            for (const col of columns) {
              const raw = r.measurements[col]
              if (raw !== undefined && raw !== "") {
                const num = Number(raw)
                if (!Number.isNaN(num)) measurements[col] = num
              }
            }
            return {
              name: r.name.trim(),
              labelName: r.labelName.trim() || undefined,
              measurements,
            }
          }),
      })
      onSaved(updated)
      onOpenChange(false)
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : "No se pudieron guardar las tallas."
      setError(message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>Tallas y size chart</DialogTitle>
          <DialogDescription>
            Define las tallas, su nombre de etiqueta y las medidas por
            dimensión.
          </DialogDescription>
        </DialogHeader>

        <div className="flex max-h-[65vh] flex-col gap-4 overflow-y-auto">
          {error && (
            <div
              role="alert"
              className="border-destructive/50 bg-destructive/10 text-destructive rounded-md border px-3 py-2 text-sm"
            >
              {error}
            </div>
          )}

          {/* Unidad + columnas */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-sm text-neutral-500">Unidad:</span>
              <div className="flex overflow-hidden rounded-md border">
                {(["cm", "inch"] as MeasurementUnit[]).map((u) => (
                  <button
                    key={u}
                    type="button"
                    onClick={() => setUnit(u)}
                    className={
                      unit === u
                        ? "bg-neutral-900 px-3 py-1 text-xs font-medium text-white"
                        : "px-3 py-1 text-xs text-neutral-600 hover:bg-neutral-100"
                    }
                  >
                    {u}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-1 flex-wrap items-center gap-2">
              {columns.map((col) => (
                <span
                  key={col}
                  className="inline-flex items-center gap-1 rounded-full bg-neutral-100 px-2.5 py-1 text-xs"
                >
                  {col}
                  <button
                    type="button"
                    onClick={() => removeColumn(col)}
                    aria-label={`Quitar ${col}`}
                    className="text-neutral-400 hover:text-red-500"
                  >
                    <X className="size-3" />
                  </button>
                </span>
              ))}
              <div className="flex items-center gap-1">
                <Input
                  value={newColumn}
                  onChange={(e) => setNewColumn(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault()
                      addColumn()
                    }
                  }}
                  placeholder="Nueva dimensión"
                  className="h-8 w-40"
                />
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={addColumn}
                >
                  <Plus className="size-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Tabla de tallas */}
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b text-left text-xs text-neutral-500">
                  <th className="p-2 font-medium">Talla</th>
                  <th className="p-2 font-medium">Etiqueta</th>
                  {columns.map((col) => (
                    <th key={col} className="p-2 font-medium">
                      {col}
                    </th>
                  ))}
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
                        placeholder="M"
                        className="h-8 w-20"
                      />
                    </td>
                    <td className="p-1.5">
                      <Input
                        value={row.labelName}
                        onChange={(e) =>
                          updateRow(index, { labelName: e.target.value })
                        }
                        placeholder="Mediano"
                        className="h-8 w-32"
                      />
                    </td>
                    {columns.map((col) => (
                      <td key={col} className="p-1.5">
                        <Input
                          type="number"
                          step="0.1"
                          value={row.measurements[col] ?? ""}
                          onChange={(e) =>
                            setMeasurement(index, col, e.target.value)
                          }
                          className="h-8 w-20"
                        />
                      </td>
                    ))}
                    <td className="p-1.5">
                      <button
                        type="button"
                        onClick={() => removeRow(index)}
                        aria-label="Quitar talla"
                        className="text-neutral-400 hover:text-red-500"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addRow}
            className="self-start"
          >
            <Plus className="size-4" />
            Añadir talla
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

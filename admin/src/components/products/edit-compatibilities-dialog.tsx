import { useEffect, useState } from "react"
import { Loader2 } from "lucide-react"

import { ApiError } from "@/lib/api"
import {
  getCompatibilityOptions,
  setProductCompatibilities,
} from "@/lib/products-api"
import type {
  CompatibilityLink,
  CompatibilityOption,
  Product,
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

interface EditCompatibilitiesDialogProps {
  product: Product
  links: CompatibilityLink[]
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved: (links: CompatibilityLink[]) => void
}

const keyOf = (areaId: string, otherAreaId: string) =>
  `${areaId}:${otherAreaId}`

/**
 * Vincula cada área de impresión del producto con áreas de otros productos.
 * Un diseño colocado en un área se puede replicar en las áreas vinculadas.
 */
export function EditCompatibilitiesDialog({
  product,
  links,
  open,
  onOpenChange,
  onSaved,
}: EditCompatibilitiesDialogProps) {
  const [options, setOptions] = useState<CompatibilityOption[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Al abrir, carga los productos candidatos y parte de los vínculos actuales.
  useEffect(() => {
    if (!open) return
    let active = true
    setSelected(
      new Set(links.map((l) => keyOf(l.printAreaId, l.compatiblePrintAreaId)))
    )
    setError(null)
    setLoading(true)
    getCompatibilityOptions(product.id)
      .then((data) => {
        if (active) setOptions(data)
      })
      .catch(() => {
        if (active) setError("No se pudieron cargar los productos.")
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [open, product.id, links])

  function toggle(key: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  async function handleSave() {
    setError(null)
    setSaving(true)
    try {
      const saved = await setProductCompatibilities(product.id, {
        links: [...selected].map((key) => {
          const [printAreaId, compatiblePrintAreaId] = key.split(":")
          return { printAreaId, compatiblePrintAreaId }
        }),
      })
      onSaved(saved)
      onOpenChange(false)
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "No se pudo guardar la compatibilidad."
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Compatibilidad de impresión</DialogTitle>
          <DialogDescription>
            Para cada área de este producto, marca las áreas de otros productos
            donde se puede imprimir el mismo diseño. Así podrás crear un diseño
            para varios productos a la vez.
          </DialogDescription>
        </DialogHeader>
        <div className="flex max-h-[60vh] flex-col gap-4 overflow-y-auto">
          {error && (
            <div
              role="alert"
              className="border-destructive/50 bg-destructive/10 text-destructive rounded-md border px-3 py-2 text-sm"
            >
              {error}
            </div>
          )}
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="size-5 animate-spin text-neutral-400" />
            </div>
          ) : product.printAreas.length === 0 ? (
            <p className="text-sm text-neutral-500">
              Define primero las áreas de impresión de este producto.
            </p>
          ) : options.length === 0 ? (
            <p className="text-sm text-neutral-500">
              No hay otros productos con áreas de impresión.
            </p>
          ) : (
            product.printAreas.map((area) => (
              <section key={area.id} className="rounded-xl border p-3">
                <h3 className="mb-2 text-sm font-semibold text-neutral-900">
                  {area.name}
                </h3>
                <div className="flex flex-col gap-2">
                  {options.map((option) => (
                    <div
                      key={option.id}
                      className="flex flex-wrap items-center gap-2"
                    >
                      <span className="w-40 shrink-0 truncate text-xs text-neutral-500">
                        {option.name}
                      </span>
                      {option.printAreas.map((other) => {
                        const key = keyOf(area.id, other.id)
                        const on = selected.has(key)
                        return (
                          <Button
                            key={other.id}
                            type="button"
                            size="sm"
                            variant={on ? "default" : "outline"}
                            aria-pressed={on}
                            onClick={() => toggle(key)}
                          >
                            {other.name}
                          </Button>
                        )
                      })}
                    </div>
                  ))}
                </div>
              </section>
            ))
          )}
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving || loading}>
            {saving && <Loader2 className="size-4 animate-spin" />}
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

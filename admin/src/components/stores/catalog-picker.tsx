import { useMemo, useState } from "react"
import { Check, Search } from "lucide-react"

import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"

export interface CatalogItem {
  id: string
  name: string
  /** Texto secundario (producto base, estado, etc.). */
  subtitle?: string | null
  imageUrl?: string | null
  /** Si es true, no se puede seleccionar (p. ej. diseño no listo). */
  disabled?: boolean
}

interface CatalogPickerProps {
  items: CatalogItem[]
  selectedIds: string[]
  onChange: (ids: string[]) => void
  emptyMessage: string
}

/**
 * Selector de elementos YA existentes del catálogo principal. Las tiendas
 * no crean productos ni diseños: solo publican los que se marquen aquí.
 */
export function CatalogPicker({
  items,
  selectedIds,
  onChange,
  emptyMessage,
}: CatalogPickerProps) {
  const [query, setQuery] = useState("")
  const selected = useMemo(() => new Set(selectedIds), [selectedIds])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return items
    return items.filter((i) =>
      `${i.name} ${i.subtitle ?? ""}`.toLowerCase().includes(q)
    )
  }, [items, query])

  const selectable = filtered.filter((i) => !i.disabled)
  const allSelected =
    selectable.length > 0 && selectable.every((i) => selected.has(i.id))

  function toggle(id: string) {
    const next = new Set(selected)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    onChange(Array.from(next))
  }

  function toggleAll() {
    const next = new Set(selected)
    for (const item of selectable) {
      if (allSelected) next.delete(item.id)
      else next.add(item.id)
    }
    onChange(Array.from(next))
  }

  if (items.length === 0) {
    return <p className="text-sm text-neutral-500">{emptyMessage}</p>
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-neutral-400" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar…"
            aria-label="Buscar en el catálogo"
            className="pl-9"
          />
        </div>
        <button
          type="button"
          onClick={toggleAll}
          className="text-sm font-medium text-neutral-600 hover:text-neutral-900"
        >
          {allSelected ? "Quitar visibles" : "Seleccionar visibles"}
        </button>
        <span className="text-xs text-neutral-500">
          {selectedIds.length} seleccionados
        </span>
      </div>

      <ul className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {filtered.map((item) => {
          const isSelected = selected.has(item.id)
          return (
            <li key={item.id}>
              <button
                type="button"
                role="checkbox"
                aria-checked={isSelected}
                disabled={item.disabled && !isSelected}
                onClick={() => toggle(item.id)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-xl border bg-white p-2.5 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-50",
                  isSelected
                    ? "border-neutral-900 ring-1 ring-neutral-900"
                    : "hover:border-neutral-400"
                )}
              >
                {item.imageUrl ? (
                  <img
                    src={item.imageUrl}
                    alt=""
                    className="size-12 shrink-0 rounded-lg border object-cover"
                  />
                ) : (
                  <div className="size-12 shrink-0 rounded-lg bg-neutral-100" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-neutral-900">
                    {item.name}
                  </p>
                  {item.subtitle && (
                    <p className="truncate text-xs text-neutral-500">
                      {item.subtitle}
                    </p>
                  )}
                </div>
                <span
                  className={cn(
                    "flex size-5 shrink-0 items-center justify-center rounded-md border",
                    isSelected
                      ? "border-neutral-900 bg-neutral-900 text-white"
                      : "border-neutral-300"
                  )}
                >
                  {isSelected && <Check className="size-3.5" />}
                </span>
              </button>
            </li>
          )
        })}
      </ul>
      {filtered.length === 0 && (
        <p className="text-sm text-neutral-500">Sin resultados.</p>
      )}
    </div>
  )
}

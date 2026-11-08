import { useState } from "react"
import { Loader2, Plus, Trash2 } from "lucide-react"

import { ApiError } from "@/lib/api"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"

export interface ManagedOption {
  id: string
  name: string
}

interface OptionManagerDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  placeholder: string
  emptyText: string
  loading?: boolean
  items: ManagedOption[]
  /** Crea la opción; debe lanzar si falla (se muestra el mensaje). */
  onAdd: (name: string) => Promise<void>
  /** Elimina la opción; debe lanzar si falla (se muestra el mensaje). */
  onDelete: (item: ManagedOption) => Promise<void>
}

/** Modal genérico para agregar y eliminar opciones de una lista. */
export function OptionManagerDialog({
  open,
  onOpenChange,
  title,
  description,
  placeholder,
  emptyText,
  loading = false,
  items,
  onAdd,
  onDelete,
}: OptionManagerDialogProps) {
  const [name, setName] = useState("")
  const [adding, setAdding] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleAdd() {
    const value = name.trim()
    if (!value) return
    setAdding(true)
    setError(null)
    try {
      await onAdd(value)
      setName("")
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo agregar.")
    } finally {
      setAdding(false)
    }
  }

  async function handleDelete(item: ManagedOption) {
    setDeletingId(item.id)
    setError(null)
    try {
      await onDelete(item)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo eliminar.")
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          setName("")
          setError(null)
        }
        onOpenChange(next)
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>

        <div className="grid gap-3">
          <div className="flex items-center gap-2">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={placeholder}
              maxLength={60}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault()
                  void handleAdd()
                }
              }}
            />
            <Button
              type="button"
              variant="outline"
              className="shrink-0"
              disabled={adding || !name.trim()}
              onClick={() => void handleAdd()}
            >
              {adding ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Plus className="size-4" />
              )}
              Agregar
            </Button>
          </div>

          {loading ? (
            <p className="text-muted-foreground text-sm">Cargando…</p>
          ) : items.length === 0 ? (
            <p className="text-muted-foreground text-sm">{emptyText}</p>
          ) : (
            <ul className="flex flex-wrap gap-2">
              {items.map((item) => (
                <li
                  key={item.id}
                  className="flex items-center gap-1 rounded-full border bg-white py-1 pr-1 pl-3 text-sm"
                >
                  <span>{item.name}</span>
                  <button
                    type="button"
                    title={`Eliminar "${item.name}"`}
                    aria-label={`Eliminar ${item.name}`}
                    className="text-muted-foreground hover:text-destructive flex size-6 shrink-0 items-center justify-center rounded-full disabled:opacity-50"
                    disabled={deletingId === item.id}
                    onClick={() => void handleDelete(item)}
                  >
                    {deletingId === item.id ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="size-3.5" />
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}

          {error && (
            <p role="alert" className="text-destructive text-sm">
              {error}
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

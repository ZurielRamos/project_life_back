import { useState, type FormEvent } from "react"
import { Loader2 } from "lucide-react"

import { ApiError } from "@/lib/api"
import { createProduct } from "@/lib/products-api"
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
import { Label } from "@/components/ui/label"

interface CreateProductDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Se llama con el producto creado tras el éxito. */
  onCreated: (product: Product) => void
}

export function CreateProductDialog({
  open,
  onOpenChange,
  onCreated,
}: CreateProductDialogProps) {
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function reset() {
    setName("")
    setDescription("")
    setError(null)
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setSaving(true)
    try {
      const product = await createProduct({
        name: name.trim(),
        description: description.trim() || undefined,
      })
      reset()
      onCreated(product)
      onOpenChange(false)
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : "No se pudo crear el producto."
      setError(message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) reset()
        onOpenChange(next)
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nuevo producto</DialogTitle>
          <DialogDescription>
            Crea el producto. Luego podrás añadir sesiones de fotos y mockups.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {error && (
            <div
              role="alert"
              className="border-destructive/50 bg-destructive/10 text-destructive rounded-md border px-3 py-2 text-sm"
            >
              {error}
            </div>
          )}

          <div className="grid gap-2">
            <Label htmlFor="product-name">Nombre</Label>
            <Input
              id="product-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Camiseta clásica"
              maxLength={150}
              required
              autoFocus
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="product-description">Descripción (opcional)</Label>
            <textarea
              id="product-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Breve descripción del producto"
              maxLength={2000}
              rows={3}
              className="border-input focus-visible:border-ring focus-visible:ring-ring/50 min-h-16 w-full resize-none rounded-md border bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:ring-[3px]"
            />
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
            <Button type="submit" disabled={saving || !name.trim()}>
              {saving && <Loader2 className="size-4 animate-spin" />}
              Crear producto
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

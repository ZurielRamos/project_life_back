import { useState, type FormEvent } from "react"
import { Loader2 } from "lucide-react"

import { ApiError } from "@/lib/api"
import { addSession } from "@/lib/products-api"
import type { PhotoSession, PrintArea } from "@/types/api"
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

interface AddSessionDialogProps {
  productId: string
  printAreas: PrintArea[]
  open: boolean
  onOpenChange: (open: boolean) => void
  onAdded: (session: PhotoSession) => void
}

export function AddSessionDialog({
  productId,
  printAreas,
  open,
  onOpenChange,
  onAdded,
}: AddSessionDialogProps) {
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [printAreaId, setPrintAreaId] = useState("")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const hasPrintAreas = printAreas.length > 0

  function reset() {
    setName("")
    setDescription("")
    setPrintAreaId("")
    setError(null)
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)

    if (!printAreaId) {
      setError("Selecciona un área de impresión para la sesión.")
      return
    }

    setSaving(true)
    try {
      const session = await addSession(productId, {
        name: name.trim(),
        description: description.trim() || undefined,
        printAreaId,
      })
      reset()
      onAdded(session)
      onOpenChange(false)
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : "No se pudo crear la sesión."
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
          <DialogTitle>Nueva sesión de fotos</DialogTitle>
          <DialogDescription>
            Cada sesión se ancla a un área de impresión del producto.
          </DialogDescription>
        </DialogHeader>

        {!hasPrintAreas ? (
          <div className="flex flex-col gap-4">
            <div className="border-destructive/50 bg-destructive/10 text-destructive rounded-md border px-3 py-2 text-sm">
              Este producto no tiene áreas de impresión. Crea al menos una en la
              sección "Áreas de impresión" antes de añadir sesiones.
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Entendido
              </Button>
            </DialogFooter>
          </div>
        ) : (
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
              <Label htmlFor="session-name">Nombre</Label>
              <Input
                id="session-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Vista frontal"
                maxLength={150}
                required
                autoFocus
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="session-print-area">Área de impresión</Label>
              <Select value={printAreaId} onValueChange={setPrintAreaId}>
                <SelectTrigger id="session-print-area" className="w-full">
                  <SelectValue placeholder="Selecciona un área" />
                </SelectTrigger>
                <SelectContent>
                  {printAreas.map((area) => (
                    <SelectItem key={area.id} value={area.id}>
                      {area.name}
                      {area.widthMm && area.heightMm
                        ? ` (${area.widthMm}×${area.heightMm} mm)`
                        : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="session-description">
                Descripción (opcional)
              </Label>
              <textarea
                id="session-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={1000}
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
              <Button
                type="submit"
                disabled={saving || !name.trim() || !printAreaId}
              >
                {saving && <Loader2 className="size-4 animate-spin" />}
                Crear sesión
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}

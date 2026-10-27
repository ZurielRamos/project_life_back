import { useState } from "react"
import { Loader2, Sparkles } from "lucide-react"

import { ApiError } from "@/lib/api"
import { regenerateDesignSeo } from "@/lib/designs-api"
import type { DesignSeoView } from "@/types/api"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"

interface RegenerateSeoDialogProps {
  designId: string
  /** URL del render para dar contexto visual a la IA (opcional). */
  imageUrl?: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onRegenerated: (seo: DesignSeoView) => void
}

export function RegenerateSeoDialog({
  designId,
  imageUrl,
  open,
  onOpenChange,
  onRegenerated,
}: RegenerateSeoDialogProps) {
  const [hints, setHints] = useState("")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleRegenerate() {
    setSaving(true)
    setError(null)
    try {
      const seo = await regenerateDesignSeo(designId, {
        hints: hints.trim() || undefined,
        imageUrl: imageUrl ?? undefined,
      })
      onRegenerated(seo)
      onOpenChange(false)
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : "No se pudo regenerar la información."
      setError(message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          setHints("")
          setError(null)
        }
        onOpenChange(next)
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Regenerar información</DialogTitle>
          <DialogDescription>
            Añade referencias sobre el diseño (personajes, temática, estilo…)
            para que la IA genere el texto correctamente. No se vuelve a
            renderizar.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          {error && (
            <div
              role="alert"
              className="border-destructive/50 bg-destructive/10 text-destructive rounded-md border px-3 py-2 text-sm"
            >
              {error}
            </div>
          )}

          <div className="grid gap-2">
            <Label htmlFor="seo-hints">Referencias</Label>
            <textarea
              id="seo-hints"
              value={hints}
              onChange={(e) => setHints(e.target.value)}
              rows={5}
              maxLength={2000}
              autoFocus
              placeholder="Ej: El diseño muestra a Goku en pose de combate, estilo anime retro, colores vibrantes…"
              className="border-input focus-visible:border-ring focus-visible:ring-ring/50 min-h-24 w-full resize-none rounded-md border bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:ring-[3px]"
            />
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
          <Button type="button" onClick={handleRegenerate} disabled={saving}>
            {saving ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Sparkles className="size-4" />
            )}
            Regenerar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

import { useEffect, useState, type FormEvent } from "react"
import { Loader2 } from "lucide-react"

import { cn } from "@/lib/utils"
import { useSubdomainAvailability } from "@/hooks/use-subdomain-availability"
import { SubdomainStatus } from "@/components/stores/subdomain-status"

import { ApiError } from "@/lib/api"
import { createStore } from "@/lib/stores-api"
import type { Store } from "@/types/api"
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

/** Convierte un nombre en un slug válido (minúsculas, números y guiones). */
function slugify(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

interface CreateStoreDialogProps {
  /** Dominio base (ej. "inkttex.com") para mostrar el sufijo del subdominio. */
  baseDomain: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Se llama con la tienda creada tras el éxito. */
  onCreated: (store: Store) => void
}

/** Alta mínima de tienda; el resto se configura en su página de detalle. */
export function CreateStoreDialog({
  baseDomain,
  open,
  onOpenChange,
  onCreated,
}: CreateStoreDialogProps) {
  const [name, setName] = useState("")
  const [slug, setSlug] = useState("")
  const [slugTouched, setSlugTouched] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const availability = useSubdomainAvailability(slug, "")
  const canSubmit = ["available", "error"].includes(availability.status)

  useEffect(() => {
    if (!open) return
    setName("")
    setSlug("")
    setSlugTouched(false)
    setError(null)
  }, [open])

  function handleNameChange(value: string) {
    setName(value)
    if (!slugTouched) setSlug(slugify(value))
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setSaving(true)
    try {
      const created = await createStore({ name: name.trim(), slug })
      onCreated(created)
      onOpenChange(false)
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "No se pudo crear la tienda."
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nueva tienda</DialogTitle>
          <DialogDescription>
            Crea la tienda y luego configura su información, dominio y
            catálogo.
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
            <Label htmlFor="store-name">Nombre</Label>
            <Input
              id="store-name"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="Mi tienda"
              minLength={2}
              maxLength={80}
              required
              autoFocus
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="store-subdomain">Subdominio</Label>
            <div className="flex">
              <Input
                id="store-subdomain"
                value={slug}
                onChange={(e) => {
                  setSlugTouched(true)
                  setSlug(slugify(e.target.value))
                }}
                placeholder="mi-tienda"
                maxLength={60}
                required
                autoComplete="off"
                spellCheck={false}
                aria-invalid={availability.status === "unavailable"}
                aria-describedby="store-subdomain-status"
                className={cn("text-right", baseDomain && "rounded-r-none")}
              />
              {baseDomain && (
                <span className="flex items-center rounded-r-md border border-l-0 bg-neutral-50 px-3 text-sm whitespace-nowrap text-neutral-500">
                  .{baseDomain}
                </span>
              )}
            </div>
            <div id="store-subdomain-status" className="min-h-4">
              <SubdomainStatus state={availability} />
            </div>
            <p className="text-xs text-neutral-500">
              {baseDomain
                ? `La tienda estará en https://${slug || "mi-tienda"}.${baseDomain}`
                : ""}
            </p>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={saving || !canSubmit}>
              {saving && <Loader2 className="size-4 animate-spin" />}
              Crear tienda
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

import { useCallback, useEffect, useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  Palette,
  Pencil,
  Plus,
} from "lucide-react"

import { ApiError } from "@/lib/api"
import { listDesigns } from "@/lib/designs-api"
import type { DesignStatus, DesignSummary } from "@/types/api"
import { AppHeader } from "@/components/app-header"
import { Button } from "@/components/ui/button"

const STATUS_LABEL: Record<DesignStatus, string> = {
  draft: "Borrador",
  generating: "Generando",
  ready: "Listo",
  failed: "Error",
}

function StatusBadge({ status }: { status: DesignStatus }) {
  const styles: Record<DesignStatus, string> = {
    draft: "bg-neutral-100 text-neutral-600",
    generating: "bg-amber-100 text-amber-700",
    ready: "bg-emerald-100 text-emerald-700",
    failed: "bg-red-100 text-red-700",
  }
  return (
    <span
      className={
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium " +
        styles[status]
      }
    >
      {status === "generating" && <Loader2 className="size-3 animate-spin" />}
      {status === "ready" && <CheckCircle2 className="size-3" />}
      {status === "failed" && <AlertCircle className="size-3" />}
      {STATUS_LABEL[status]}
    </span>
  )
}

export function DesignsPage() {
  const navigate = useNavigate()
  const [designs, setDesigns] = useState<DesignSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Refresca la lista. `silent` evita el spinner de pantalla completa
  // cuando el refresco viene del polling de diseños en generación.
  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    setError(null)
    try {
      setDesigns(await listDesigns())
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : "No se pudieron cargar los diseños."
      setError(message)
    } finally {
      if (!silent) setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  // Mientras haya diseños "generando", refresca en segundo plano para que
  // el estado se actualice solo (sin tener que recargar la página).
  const hasGenerating = designs.some((d) => d.status === "generating")
  useEffect(() => {
    if (!hasGenerating) return
    const interval = setInterval(() => {
      void load(true)
    }, 3000)
    return () => clearInterval(interval)
  }, [hasGenerating, load])

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-6 p-6">
      <AppHeader
        title="Diseños"
        description="Crea diseños colocando imágenes en las áreas de impresión de un producto."
        actions={
          <Button onClick={() => navigate("/designs/new")}>
            <Plus className="size-4" />
            Nuevo diseño
          </Button>
        }
      />

      {loading ? (
        <div className="flex flex-1 items-center justify-center">
          <Loader2 className="size-6 animate-spin text-neutral-400" />
        </div>
      ) : error ? (
        <div
          role="alert"
          className="border-destructive/50 bg-destructive/10 text-destructive rounded-md border px-4 py-3 text-sm"
        >
          {error}
        </div>
      ) : designs.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center text-neutral-500">
          <Palette className="size-10 text-neutral-300" />
          <p className="text-sm">Aún no hay diseños.</p>
          <Button variant="outline" onClick={() => navigate("/designs/new")}>
            <Plus className="size-4" />
            Crear el primero
          </Button>
        </div>
      ) : (
        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {designs.map((design) => (
              <Link
                key={design.id}
                to={`/designs/${design.id}`}
                className="flex flex-col overflow-hidden rounded-xl border bg-white transition-colors hover:border-neutral-300"
              >
                {/* Portada: primer render logrado del diseño. */}
                <div className="relative flex aspect-square items-center justify-center bg-neutral-100">
                  {design.coverImageUrl ? (
                    <img
                      src={design.coverImageUrl}
                      alt={design.name}
                      className="size-full object-cover"
                    />
                  ) : (
                    <Palette className="size-8 text-neutral-300" />
                  )}
                  {design.editable && (
                    <span className="absolute left-1.5 top-1.5 inline-flex items-center gap-1 rounded-full bg-neutral-900/85 px-1.5 py-0.5 text-[10px] font-medium text-white">
                      <Pencil className="size-2.5" />
                      Editable
                    </span>
                  )}
                </div>

                <div className="flex flex-1 flex-col gap-1 p-2.5">
                  <h3 className="line-clamp-2 text-sm font-medium text-neutral-900">
                    {design.name}
                  </h3>
                  <p className="truncate text-xs text-neutral-500">
                    {design.productName ?? "Producto"}
                  </p>
                  <div className="mt-auto pt-1">
                    <StatusBadge status={design.status} />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

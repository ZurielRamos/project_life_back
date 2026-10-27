import { useCallback, useEffect, useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  Palette,
  Plus,
} from "lucide-react"

import { ApiError } from "@/lib/api"
import { listDesigns } from "@/lib/designs-api"
import type { Design, DesignStatus } from "@/types/api"
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
  const [designs, setDesigns] = useState<Design[]>([])
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
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Diseños</h1>
          <p className="text-sm text-neutral-500">
            Crea diseños colocando imágenes en las áreas de impresión de un
            producto.
          </p>
        </div>
        <Button onClick={() => navigate("/designs/new")}>
          <Plus className="size-4" />
          Nuevo diseño
        </Button>
      </header>

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
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {designs.map((design) => (
            <Link
              key={design.id}
              to={`/designs/${design.id}`}
              className="flex flex-col gap-2 rounded-2xl border bg-white p-4 transition-colors hover:border-neutral-300"
            >
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-semibold text-neutral-900">
                  {design.name}
                </h3>
                <Palette className="size-5 shrink-0 text-neutral-300" />
              </div>
              <p className="text-sm text-neutral-500">
                {design.product?.name ?? "Producto"}
              </p>
              <StatusBadge status={design.status} />
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

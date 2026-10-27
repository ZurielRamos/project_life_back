import { useCallback, useEffect, useRef, useState } from "react"
import { Link, useParams } from "react-router-dom"
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Loader2,
  RefreshCw,
  Sparkles,
} from "lucide-react"

import { ApiError } from "@/lib/api"
import {
  getDesign,
  getDesignStatus,
  regenerateDesign,
} from "@/lib/designs-api"
import type {
  Design,
  DesignRender,
  DesignSeoView,
  DesignStatus,
} from "@/types/api"
import { Button } from "@/components/ui/button"
import { RegenerateSeoDialog } from "@/components/designs/regenerate-seo-dialog"

/** Milisegundos entre consultas de estado mientras se genera. */
const POLL_INTERVAL_MS = 2500

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
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium " +
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

/** Clave de grupo de color (null = sin color). */
function colorKey(r: DesignRender): string {
  return r.colorId ?? "__none__"
}

export function DesignDetailPage() {
  const { id } = useParams<{ id: string }>()

  const [design, setDesign] = useState<Design | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [regenerating, setRegenerating] = useState(false)
  const [seoOpen, setSeoOpen] = useState(false)
  const [seo, setSeo] = useState<DesignSeoView | null>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const loadFull = useCallback(async () => {
    if (!id) return
    try {
      const data = await getDesign(id)
      setDesign(data)
      setSeo(data.seo ?? null)
      setError(null)
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : "No se pudo cargar el diseño."
      setError(message)
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    void loadFull()
  }, [loadFull])

  // Polling mientras el diseño está "generating": consulta el estado ligero
  // y, cuando termina, recarga el diseño completo (renders + SEO).
  useEffect(() => {
    if (!id || !design) return
    if (design.status !== "generating") {
      if (pollRef.current) {
        clearInterval(pollRef.current)
        pollRef.current = null
      }
      return
    }
    if (pollRef.current) return // ya hay un poll activo

    pollRef.current = setInterval(async () => {
      try {
        const status = await getDesignStatus(id)
        if (status.status !== "generating") {
          if (pollRef.current) {
            clearInterval(pollRef.current)
            pollRef.current = null
          }
          await loadFull()
        } else {
          // Refresca progreso parcial (renders que ya terminaron).
          await loadFull()
        }
      } catch {
        // Ignora errores transitorios de red; el siguiente tick reintenta.
      }
    }, POLL_INTERVAL_MS)

    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current)
        pollRef.current = null
      }
    }
  }, [id, design, loadFull])

  async function handleRegenerate() {
    if (!id) return
    setRegenerating(true)
    setError(null)
    try {
      const updated = await regenerateDesign(id)
      setDesign(updated)
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : "No se pudo regenerar el diseño."
      setError(message)
    } finally {
      setRegenerating(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center">
        <Loader2 className="size-6 animate-spin text-neutral-400" />
      </div>
    )
  }

  if (error && !design) {
    return (
      <div className="flex min-h-0 flex-1 flex-col gap-4 p-6">
        <Link
          to="/designs"
          className="inline-flex items-center gap-1.5 text-sm text-neutral-500 hover:text-neutral-900"
        >
          <ArrowLeft className="size-4" />
          Volver a diseños
        </Link>
        <div
          role="alert"
          className="border-destructive/50 bg-destructive/10 text-destructive rounded-md border px-4 py-3 text-sm"
        >
          {error}
        </div>
      </div>
    )
  }

  if (!design) return null

  const renders = design.renders ?? []
  const colors = design.product?.colors ?? []
  const colorById = new Map(colors.map((c) => [c.id, c]))

  // Agrupa renders por color, preservando el orden de aparición.
  const groups = new Map<string, DesignRender[]>()
  for (const r of renders) {
    const key = colorKey(r)
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(r)
  }

  const total = renders.length
  const done = renders.filter((r) => r.status === "done").length
  const failed = renders.filter((r) => r.status === "failed").length
  const isGenerating = design.status === "generating"

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto p-6">
      <div>
        <Link
          to="/designs"
          className="mb-3 inline-flex items-center gap-1.5 text-sm text-neutral-500 hover:text-neutral-900"
        >
          <ArrowLeft className="size-4" />
          Volver a diseños
        </Link>
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-neutral-900">
                {design.name}
              </h1>
              <StatusBadge status={design.status} />
            </div>
            <p className="mt-1 text-sm text-neutral-500">
              {design.product?.name}
            </p>
          </div>
          <Button
            variant="outline"
            onClick={handleRegenerate}
            disabled={regenerating || isGenerating}
          >
            {regenerating ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <RefreshCw className="size-4" />
            )}
            Regenerar
          </Button>
        </div>
      </div>

      {error && (
        <div
          role="alert"
          className="border-destructive/50 bg-destructive/10 text-destructive rounded-md border px-4 py-3 text-sm"
        >
          {error}
        </div>
      )}

      {/* Progreso de generación */}
      {total > 0 && (
        <div className="flex flex-col gap-2 rounded-2xl border bg-white p-4">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium text-neutral-900">
              {isGenerating ? "Generando renders…" : "Renders"}
            </span>
            <span className="text-neutral-500">
              {done}/{total} completados
              {failed > 0 && ` · ${failed} con error`}
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-neutral-100">
            <div
              className="h-full rounded-full bg-neutral-900 transition-all"
              style={{ width: `${total ? (done / total) * 100 : 0}%` }}
            />
          </div>
          {design.errorMessage && (
            <p className="text-xs text-amber-600">{design.errorMessage}</p>
          )}
        </div>
      )}

      {/* Renders agrupados por color */}
      {groups.size === 0 ? (
        <div className="flex flex-1 items-center justify-center rounded-2xl border border-dashed text-sm text-neutral-400">
          {isGenerating
            ? "Preparando los renders…"
            : "Este diseño aún no tiene renders."}
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {[...groups.entries()].map(([key, items]) => {
            const color = key === "__none__" ? null : colorById.get(key)
            const label =
              color?.name ?? items[0]?.colorName ?? "Sin color"
            const hex = color?.hex ?? items[0]?.colorHex ?? null
            return (
              <section key={key} className="flex flex-col gap-3">
                <div className="flex items-center gap-2">
                  {hex && (
                    <span
                      className="size-4 rounded-full border border-black/10"
                      style={{ backgroundColor: hex }}
                    />
                  )}
                  <h2 className="text-sm font-semibold text-neutral-900">
                    {label}
                  </h2>
                </div>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                  {items.map((r) => (
                    <div key={r.id} className="flex flex-col gap-1.5">
                      <div className="relative flex aspect-square items-center justify-center overflow-hidden rounded-xl bg-neutral-100">
                        {r.status === "done" && r.imageUrl ? (
                          <img
                            src={r.imageUrl}
                            alt={`${label} · ${r.printAreaName ?? ""}`}
                            className="size-full object-contain"
                          />
                        ) : r.status === "failed" ? (
                          <div className="flex flex-col items-center gap-1 px-3 text-center">
                            <AlertCircle className="size-5 text-red-400" />
                            <span className="text-[11px] text-neutral-400">
                              {r.errorMessage ?? "Error"}
                            </span>
                          </div>
                        ) : (
                          <Loader2 className="size-5 animate-spin text-neutral-300" />
                        )}
                      </div>
                      <span className="truncate text-xs text-neutral-500">
                        {r.printAreaName ?? "Área"}
                        {r.sessionName ? ` · ${r.sessionName}` : ""}
                      </span>
                    </div>
                  ))}
                </div>
              </section>
            )
          })}
        </div>
      )}

      {/* SEO generado por IA */}
      {seo && (
        <section className="flex flex-col gap-3 rounded-2xl border bg-white p-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-neutral-900">
              SEO generado
            </h2>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSeoOpen(true)}
            >
              <Sparkles className="size-4" />
              Regenerar
            </Button>
          </div>

          <div className="flex flex-col gap-0.5">
            <span className="text-xs text-neutral-400">Título</span>
            <span className="text-sm font-medium text-neutral-900">
              {seo.title}
            </span>
          </div>

          <div className="flex flex-col gap-0.5">
            <span className="text-xs text-neutral-400">Slug</span>
            <span className="font-mono text-xs text-neutral-600">
              {seo.slug}
            </span>
          </div>

          {seo.metaTitle && (
            <div className="flex flex-col gap-0.5">
              <span className="text-xs text-neutral-400">Meta title</span>
              <span className="text-sm text-neutral-700">{seo.metaTitle}</span>
            </div>
          )}

          {seo.metaDescription && (
            <div className="flex flex-col gap-0.5">
              <span className="text-xs text-neutral-400">Meta description</span>
              <span className="text-sm text-neutral-700">
                {seo.metaDescription}
              </span>
            </div>
          )}

          <div className="flex flex-col gap-0.5">
            <span className="text-xs text-neutral-400">Descripción</span>
            <p className="text-sm leading-relaxed text-neutral-700">
              {seo.description}
            </p>
          </div>

          {seo.keywords.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <span className="text-xs text-neutral-400">Palabras clave</span>
              <div className="flex flex-wrap gap-1.5">
                {seo.keywords.map((kw) => (
                  <span
                    key={kw}
                    className="rounded-full bg-neutral-100 px-2.5 py-0.5 text-xs text-neutral-700"
                  >
                    {kw}
                  </span>
                ))}
              </div>
            </div>
          )}

          {seo.jsonLd && (
            <details className="text-xs">
              <summary className="cursor-pointer text-neutral-400 hover:text-neutral-700">
                Datos estructurados (JSON-LD)
              </summary>
              <pre className="mt-2 overflow-x-auto rounded-lg bg-neutral-900 p-3 text-[11px] leading-relaxed text-neutral-100">
                {JSON.stringify(seo.jsonLd, null, 2)}
              </pre>
            </details>
          )}

          {seo.openGraph && (
            <details className="text-xs">
              <summary className="cursor-pointer text-neutral-400 hover:text-neutral-700">
                Open Graph / Twitter
              </summary>
              <pre className="mt-2 overflow-x-auto rounded-lg bg-neutral-900 p-3 text-[11px] leading-relaxed text-neutral-100">
                {JSON.stringify(seo.openGraph, null, 2)}
              </pre>
            </details>
          )}
        </section>
      )}

      <RegenerateSeoDialog
        designId={design.id}
        imageUrl={
          renders.find((r) => r.status === "done" && r.imageUrl)?.imageUrl ??
          null
        }
        open={seoOpen}
        onOpenChange={setSeoOpen}
        onRegenerated={setSeo}
      />
    </div>
  )
}

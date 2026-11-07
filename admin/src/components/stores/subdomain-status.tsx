import { Check, Loader2, X } from "lucide-react"

import type { SubdomainState } from "@/hooks/use-subdomain-availability"

/** Indicador de disponibilidad bajo el campo de subdominio. */
export function SubdomainStatus({ state }: { state: SubdomainState }) {
  const { status, message } = state

  if (status === "checking") {
    return (
      <p
        role="status"
        className="flex items-center gap-1.5 text-xs text-neutral-500"
      >
        <Loader2 className="size-3.5 animate-spin" />
        Comprobando disponibilidad…
      </p>
    )
  }
  if (status === "available") {
    return (
      <p
        role="status"
        className="flex items-center gap-1.5 text-xs font-medium text-emerald-600"
      >
        <Check className="size-3.5" />
        Subdominio disponible
      </p>
    )
  }
  if (status === "unavailable") {
    return (
      <p
        role="alert"
        className="text-destructive flex items-center gap-1.5 text-xs font-medium"
      >
        <X className="size-3.5" />
        {message ?? "Subdominio no disponible"}
      </p>
    )
  }
  if (status === "error") {
    return <p className="text-xs text-amber-600">{message}</p>
  }
  // unchanged / pending: texto de ayuda neutro.
  return (
    <p className="text-xs text-neutral-500">
      Solo minúsculas, números y guiones.
    </p>
  )
}

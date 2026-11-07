import { useEffect, useState } from "react"

import { checkSubdomainAvailability } from "@/lib/stores-api"

/** Espera sin escribir antes de consultar la disponibilidad. */
const DEBOUNCE_MS = 1000

export type SubdomainStatus =
  /** Es el subdominio ya guardado de la tienda: no hay nada que comprobar. */
  | "unchanged"
  /** Cambió, pero aún no pasó el segundo de espera. */
  | "pending"
  | "checking"
  | "available"
  | "unavailable"
  /** No se pudo consultar (red/API). El servidor valida igualmente al guardar. */
  | "error"

export interface SubdomainState {
  status: SubdomainStatus
  message: string | null
}

const FORMAT = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

/** Validación de formato local: evita consultar la API con valores obvios. */
function localError(value: string): string | null {
  if (value.length < 2) return "Debe tener al menos 2 caracteres"
  if (!FORMAT.test(value)) {
    return "Solo minúsculas, números y guiones (sin guiones al inicio o final)"
  }
  return null
}

/**
 * Comprueba la disponibilidad de un subdominio 1 segundo después de que el
 * usuario deja de escribir. Devuelve el estado para pintar el indicador y
 * decidir si se puede guardar.
 *
 * @param value      Subdominio que se está escribiendo.
 * @param savedValue Subdominio ya guardado (se considera disponible).
 * @param storeId    Tienda en edición (se excluye de la comprobación).
 */
export function useSubdomainAvailability(
  value: string,
  savedValue: string,
  storeId?: string
): SubdomainState {
  // Último resultado conocido, asociado al valor que se consultó.
  const [result, setResult] = useState<{
    value: string
    status: SubdomainStatus
    message: string | null
  } | null>(null)

  const unchanged = value === savedValue
  const formatError = unchanged ? null : localError(value)
  const shouldCheck = !unchanged && !formatError

  useEffect(() => {
    if (!shouldCheck) return
    let active = true
    const timer = window.setTimeout(() => {
      setResult({ value, status: "checking", message: null })
      checkSubdomainAvailability(value, storeId)
        .then((res) => {
          if (!active) return
          setResult({
            value,
            status: res.available ? "available" : "unavailable",
            message: res.message,
          })
        })
        .catch(() => {
          if (!active) return
          setResult({
            value,
            status: "error",
            message: "No se pudo comprobar la disponibilidad",
          })
        })
    }, DEBOUNCE_MS)
    return () => {
      active = false
      window.clearTimeout(timer)
    }
  }, [value, shouldCheck, storeId])

  if (unchanged) return { status: "unchanged", message: null }
  if (formatError) return { status: "unavailable", message: formatError }
  // Un resultado de otro valor ya no aplica: seguimos esperando.
  if (!result || result.value !== value) {
    return { status: "pending", message: null }
  }
  return { status: result.status, message: result.message }
}

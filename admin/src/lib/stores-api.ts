// Llamadas al módulo de tiendas de la API (/api/stores).
import { apiFetch } from "@/lib/api"
import type {
  CreateStorePayload,
  Store,
  StoreSummary,
  UpdateStorePayload,
} from "@/types/api"

/** Lista las tiendas con contadores de productos y diseños. */
export function listStores(): Promise<StoreSummary[]> {
  return apiFetch<StoreSummary[]>("/stores")
}

/** Obtiene una tienda con los ids de su catálogo publicado. */
export function getStore(id: string): Promise<Store> {
  return apiFetch<Store>(`/stores/${id}`)
}

export function createStore(body: CreateStorePayload): Promise<Store> {
  return apiFetch<Store>("/stores", { method: "POST", body })
}

export function updateStore(
  id: string,
  body: UpdateStorePayload
): Promise<Store> {
  return apiFetch<Store>(`/stores/${id}`, { method: "PATCH", body })
}

export function deleteStore(id: string): Promise<void> {
  return apiFetch<void>(`/stores/${id}`, { method: "DELETE" })
}

/** Configuración global de tiendas (dominio base de los subdominios). */
export interface StoresConfig {
  /** Ej. "inkttex.com"; null si la API no lo tiene configurado. */
  baseDomain: string | null
}

export function getStoresConfig(): Promise<StoresConfig> {
  return apiFetch<StoresConfig>("/stores/config")
}

/** Resultado de comprobar si un subdominio está libre. */
export interface SubdomainAvailability {
  available: boolean
  /** Motivo cuando no está disponible. */
  message: string | null
}

/**
 * Comprueba si un subdominio se puede usar. `storeId` excluye a la tienda
 * que se está editando.
 */
export function checkSubdomainAvailability(
  subdomain: string,
  storeId?: string
): Promise<SubdomainAvailability> {
  const params = new URLSearchParams({ subdomain })
  if (storeId) params.set("storeId", storeId)
  return apiFetch<SubdomainAvailability>(
    `/stores/subdomain-availability?${params.toString()}`
  )
}

// Llamadas al módulo de tiendas de la API (/api/stores).
import { apiFetch } from "@/lib/api"
import type {
  CreateStorePayload,
  Store,
  StoreSummary,
  UpdateStorePayload,
  NotificationsView,
  NotificationTestResult,
  UpdateNotificationsPayload,
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

// --- Dominios personalizados ---

export interface DnsRecord {
  type: "A" | "CNAME" | "TXT"
  /** Nombre relativo al dominio ("@" = raíz). */
  name: string
  value: string
  purpose: "routing" | "verification"
}

export interface StoreDomain {
  id: string
  hostname: string
  kind: "apex" | "subdomain"
  /** Dominio favorito de la tienda (URL canónica). */
  isPrimary: boolean
  status: "pending" | "active" | "error"
  sslStatus: "pending" | "issued"
  dnsRecords: DnsRecord[]
  lastError: string | null
  lastCheckedAt: string | null
  verifiedAt: string | null
  createdAt: string
}

export function listStoreDomains(storeId: string): Promise<StoreDomain[]> {
  return apiFetch<StoreDomain[]>(`/stores/${storeId}/domains`)
}

export function addStoreDomain(
  storeId: string,
  hostname: string
): Promise<StoreDomain> {
  return apiFetch<StoreDomain>(`/stores/${storeId}/domains`, {
    method: "POST",
    body: { hostname },
  })
}

export function verifyStoreDomain(
  storeId: string,
  domainId: string
): Promise<StoreDomain> {
  return apiFetch<StoreDomain>(
    `/stores/${storeId}/domains/${domainId}/verify`,
    { method: "POST" }
  )
}

export function removeStoreDomain(
  storeId: string,
  domainId: string
): Promise<void> {
  return apiFetch<void>(`/stores/${storeId}/domains/${domainId}`, {
    method: "DELETE",
  })
}

/** Resultado de subir una imagen del sitio (logo, banner…). */
export interface UploadedAsset {
  url: string
  width: number
  height: number
}

/** Sube una imagen (data URI) para usarla en el sitio web de la tienda. */
export function uploadStoreAsset(
  storeId: string,
  dataUri: string
): Promise<UploadedAsset> {
  return apiFetch<UploadedAsset>(`/stores/${storeId}/assets`, {
    method: "POST",
    body: { dataUri },
  })
}

/** Define el dominio favorito; `null` = subdominio de la plataforma. */
export function setPrimaryStoreDomain(
  storeId: string,
  domainId: string | null
): Promise<StoreDomain[]> {
  return apiFetch<StoreDomain[]>(`/stores/${storeId}/domains/primary`, {
    method: "PATCH",
    body: { domainId },
  })
}

// --- Notificaciones (SMTP / WhatsApp) ---

/** Ajustes de notificaciones de la tienda (sin secretos). */
export function getNotifications(storeId: string): Promise<NotificationsView> {
  return apiFetch<NotificationsView>(`/stores/${storeId}/notifications`)
}

export function updateNotifications(
  storeId: string,
  body: UpdateNotificationsPayload
): Promise<NotificationsView> {
  return apiFetch<NotificationsView>(`/stores/${storeId}/notifications`, {
    method: "PATCH",
    body,
  })
}

/** Envía un correo de prueba con el SMTP guardado. */
export function sendTestEmail(
  storeId: string,
  to: string
): Promise<NotificationTestResult> {
  return apiFetch<NotificationTestResult>(
    `/stores/${storeId}/notifications/test-email`,
    { method: "POST", body: { to } }
  )
}

/** Envía la plantilla de autenticación de WhatsApp a un número de prueba. */
export function sendTestWhatsapp(
  storeId: string,
  phone: string
): Promise<NotificationTestResult> {
  return apiFetch<NotificationTestResult>(
    `/stores/${storeId}/notifications/test-whatsapp`,
    { method: "POST", body: { phone } }
  )
}

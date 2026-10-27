// Llamadas al módulo de productos de la API.
import { apiFetch } from "@/lib/api"
import type {
  CreateProductPayload,
  ImportSessionMockupsPayload,
  ListRemoteParams,
  PhotoSession,
  PhotoSessionInput,
  Product,
  RemoteSudomockListResult,
  ReorderMockupsPayload,
  SetColorsPayload,
  SetPrintAreasPayload,
  SetSizesPayload,
  UpdateProductPayload,
} from "@/types/api"

// --- Catálogo remoto de SudoMock ---

/** Lista el catálogo de plantillas de SudoMock para importar a una sesión. */
export function listRemoteSudomockMockups({
  limit = 50,
  offset = 0,
  name,
  accountId,
}: ListRemoteParams = {}): Promise<RemoteSudomockListResult> {
  const params = new URLSearchParams()
  params.set("limit", String(limit))
  params.set("offset", String(offset))
  if (name) params.set("name", name)
  if (accountId) params.set("accountId", accountId)
  return apiFetch<RemoteSudomockListResult>(
    `/products/mockups/remote?${params.toString()}`
  )
}

// --- Productos ---

/** Lista los productos (las sesiones vienen sin sus mockups). */
export function listProducts(): Promise<Product[]> {
  return apiFetch<Product[]>("/products")
}

/** Obtiene un producto con sus sesiones y mockups embebidos. */
export function getProduct(id: string): Promise<Product> {
  return apiFetch<Product>(`/products/${id}`)
}

export function createProduct(body: CreateProductPayload): Promise<Product> {
  return apiFetch<Product>("/products", { method: "POST", body })
}

export function updateProduct(
  id: string,
  body: UpdateProductPayload
): Promise<Product> {
  return apiFetch<Product>(`/products/${id}`, { method: "PATCH", body })
}

/** Reemplaza por completo las tallas del producto (incluye size chart). */
export function setProductSizes(
  id: string,
  body: SetSizesPayload
): Promise<Product> {
  return apiFetch<Product>(`/products/${id}/sizes`, { method: "PUT", body })
}

/** Reemplaza por completo los colores disponibles del producto. */
export function setProductColors(
  id: string,
  body: SetColorsPayload
): Promise<Product> {
  return apiFetch<Product>(`/products/${id}/colors`, { method: "PUT", body })
}

/** Reemplaza por completo las áreas de impresión del producto. */
export function setProductPrintAreas(
  id: string,
  body: SetPrintAreasPayload
): Promise<Product> {
  return apiFetch<Product>(`/products/${id}/print-areas`, {
    method: "PUT",
    body,
  })
}

export function deleteProduct(id: string): Promise<void> {
  return apiFetch<void>(`/products/${id}`, { method: "DELETE" })
}

// --- Sesiones de fotos ---

export function getSession(
  productId: string,
  sessionId: string
): Promise<PhotoSession> {
  return apiFetch<PhotoSession>(
    `/products/${productId}/sessions/${sessionId}`
  )
}

export function addSession(
  productId: string,
  body: PhotoSessionInput
): Promise<PhotoSession> {
  return apiFetch<PhotoSession>(`/products/${productId}/sessions`, {
    method: "POST",
    body,
  })
}

export function updateSession(
  productId: string,
  sessionId: string,
  body: PhotoSessionInput
): Promise<PhotoSession> {
  return apiFetch<PhotoSession>(
    `/products/${productId}/sessions/${sessionId}`,
    { method: "PUT", body }
  )
}

export function deleteSession(
  productId: string,
  sessionId: string
): Promise<void> {
  return apiFetch<void>(`/products/${productId}/sessions/${sessionId}`, {
    method: "DELETE",
  })
}

// --- Mockups de la sesión ---

/** Importa plantillas de SudoMock a una sesión (se añaden al final). */
export function importSessionMockups(
  productId: string,
  sessionId: string,
  body: ImportSessionMockupsPayload
): Promise<PhotoSession> {
  return apiFetch<PhotoSession>(
    `/products/${productId}/sessions/${sessionId}/mockups/import`,
    { method: "POST", body }
  )
}

/** Reordena los mockups ya importados de una sesión. */
export function reorderSessionMockups(
  productId: string,
  sessionId: string,
  body: ReorderMockupsPayload
): Promise<PhotoSession> {
  return apiFetch<PhotoSession>(
    `/products/${productId}/sessions/${sessionId}/mockups/order`,
    { method: "PATCH", body }
  )
}

/** Quita un mockup de una sesión. */
export function removeSessionMockup(
  productId: string,
  sessionId: string,
  sessionMockupId: string
): Promise<PhotoSession> {
  return apiFetch<PhotoSession>(
    `/products/${productId}/sessions/${sessionId}/mockups/${sessionMockupId}`,
    { method: "DELETE" }
  )
}

// Llamadas al módulo de diseños de la API.
import { ApiError, apiFetch, getToken } from "@/lib/api"
import type {
  Design,
  DesignSeoView,
  DesignStatusView,
  DesignSummary,
  GenerateDesignPayload,
  PreviewDesignPayload,
  PreviewResult,
  RenderSvgPayload,
  RenderSvgResult,
  SetPlacementsPayload,
  UpdateDesignPayload,
  UploadedImage,
} from "@/types/api"

export function listDesigns(): Promise<DesignSummary[]> {
  return apiFetch<DesignSummary[]>("/designs")
}

export function getDesign(id: string): Promise<Design> {
  return apiFetch<Design>(`/designs/${id}`)
}

export function updateDesign(
  id: string,
  body: UpdateDesignPayload
): Promise<Design> {
  return apiFetch<Design>(`/designs/${id}`, { method: "PATCH", body })
}

export function deleteDesign(id: string): Promise<void> {
  return apiFetch<void>(`/designs/${id}`, { method: "DELETE" })
}

/** Sube una imagen (data URI) a Cloudinary vía la API. */
export function uploadDesignImage(dataUri: string): Promise<UploadedImage> {
  return apiFetch<UploadedImage>("/designs/upload-image", {
    method: "POST",
    body: { dataUri },
  })
}

/**
 * Rasteriza una plantilla SVG sustituyendo sus campos de texto. Devuelve el
 * PNG (en Cloudinary), el SVG fuente y las fuentes que falta registrar.
 */
export function renderDesignSvg(
  body: RenderSvgPayload
): Promise<RenderSvgResult> {
  return apiFetch<RenderSvgResult>("/designs/render-svg", {
    method: "POST",
    body,
  })
}

/** Reemplaza por completo las colocaciones del diseño. */
export function setDesignPlacements(
  id: string,
  body: SetPlacementsPayload
): Promise<Design> {
  return apiFetch<Design>(`/designs/${id}/placements`, {
    method: "PUT",
    body,
  })
}

/** Regenera solo el SEO (texto/metadatos) con referencias, sin render. */
export function regenerateDesignSeo(
  id: string,
  body: { hints?: string; imageUrl?: string }
): Promise<DesignSeoView> {
  return apiFetch<DesignSeoView>(`/designs/${id}/seo`, {
    method: "POST",
    body,
  })
}

/**
 * Crea el diseño (estado "generating") y encola la generación de renders
 * en segundo plano. Devuelve el diseño recién creado.
 */
export function generateDesign(
  body: GenerateDesignPayload
): Promise<Design> {
  return apiFetch<Design>("/designs/generate", { method: "POST", body })
}

/**
 * Genera una vista previa efímera (render del primer color + SEO). No crea
 * ni guarda nada: solo devuelve el render temporal y el SEO para mostrarlos.
 */
export function previewDesign(
  body: PreviewDesignPayload
): Promise<PreviewResult> {
  return apiFetch<PreviewResult>("/designs/preview", {
    method: "POST",
    body,
  })
}

/** Estado ligero para polling (progreso de renders + estado). */
export function getDesignStatus(id: string): Promise<DesignStatusView> {
  return apiFetch<DesignStatusView>(`/designs/${id}/status`)
}

/** Reencola la generación de renders (reintento tras fallos o rehacer). */
export function regenerateDesign(id: string): Promise<Design> {
  return apiFetch<Design>(`/designs/${id}/regenerate`, { method: "POST" })
}

/**
 * Descarga el ZIP del diseño (imágenes por área, SVG y fuentes) y dispara la
 * descarga en el navegador. Usa el token de autenticación.
 */
export async function downloadDesignZip(id: string): Promise<void> {
  const API_URL = import.meta.env.VITE_API_URL ?? "/api"
  const token = getToken()
  const res = await fetch(`${API_URL}/designs/${id}/download`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })
  if (!res.ok) {
    throw new ApiError(
      `No se pudo descargar el diseño (${res.status})`,
      res.status,
      null
    )
  }
  // Nombre de archivo desde Content-Disposition (fallback al id).
  const disposition = res.headers.get("content-disposition") ?? ""
  const match = disposition.match(/filename="?([^"]+)"?/)
  const filename = match?.[1] ?? `${id}.zip`

  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

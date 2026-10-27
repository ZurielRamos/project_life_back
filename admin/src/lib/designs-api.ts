// Llamadas al módulo de diseños de la API.
import { apiFetch } from "@/lib/api"
import type {
  Design,
  DesignSeoView,
  DesignStatusView,
  GenerateDesignPayload,
  PreviewDesignPayload,
  PreviewResult,
  SetPlacementsPayload,
  UpdateDesignPayload,
  UploadedImage,
} from "@/types/api"

export function listDesigns(): Promise<Design[]> {
  return apiFetch<Design[]>("/designs")
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

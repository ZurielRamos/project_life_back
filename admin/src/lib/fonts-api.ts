// Llamadas al módulo de fuentes (tipografías para plantillas SVG).
import { apiFetch } from "@/lib/api"
import type { CreateFontPayload, Font } from "@/types/api"

/** Lista las fuentes registradas. */
export function listFonts(): Promise<Font[]> {
  return apiFetch<Font[]>("/fonts")
}

/** Registra una fuente (archivo como data URI). */
export function createFont(body: CreateFontPayload): Promise<Font> {
  return apiFetch<Font>("/fonts", { method: "POST", body })
}

/** Elimina una fuente por id. */
export function deleteFont(id: string): Promise<void> {
  return apiFetch<void>(`/fonts/${id}`, { method: "DELETE" })
}

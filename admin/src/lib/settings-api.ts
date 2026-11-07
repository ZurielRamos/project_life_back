// Llamadas al módulo de ajustes de generación.
import { apiFetch } from "@/lib/api"

export interface GenerationSettings {
  id: string
  maxColorGenerationsPerHour: number
  updatedAt: string
}

/** Obtiene los ajustes de generación. */
export function getGenerationSettings(): Promise<GenerationSettings> {
  return apiFetch<GenerationSettings>("/settings/generation")
}

/** Actualiza los ajustes de generación. */
export function updateGenerationSettings(body: {
  maxColorGenerationsPerHour: number
}): Promise<GenerationSettings> {
  return apiFetch<GenerationSettings>("/settings/generation", {
    method: "PUT",
    body,
  })
}

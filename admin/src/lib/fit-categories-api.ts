// Llamadas al módulo de categorías de ajuste (fit) de la API.
import { apiFetch } from "@/lib/api"
import type {
  CreateFitCategoryPayload,
  FitCategory,
  ProductFit,
} from "@/types/api"

/** Lista las categorías de ajuste; si se pasa `fit`, filtra por ese ajuste. */
export function listFitCategories(fit?: ProductFit): Promise<FitCategory[]> {
  const qs = fit ? `?fit=${encodeURIComponent(fit)}` : ""
  return apiFetch<FitCategory[]>(`/fit-categories${qs}`)
}

/** Crea una nueva categoría dentro de un ajuste. */
export function createFitCategory(
  body: CreateFitCategoryPayload
): Promise<FitCategory> {
  return apiFetch<FitCategory>("/fit-categories", { method: "POST", body })
}

/** Elimina una categoría de ajuste por id. */
export function deleteFitCategory(id: string): Promise<void> {
  return apiFetch<void>(`/fit-categories/${id}`, { method: "DELETE" })
}

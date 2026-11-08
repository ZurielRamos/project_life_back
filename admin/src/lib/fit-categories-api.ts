// Llamadas al módulo de categorías de ajuste (fit) de la API.
import { apiFetch } from "@/lib/api"
import type {
  CreateFitCategoryPayload,
  Fit,
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
/** Lista los ajustes administrables. */
export function listFits(): Promise<Fit[]> {
  return apiFetch<Fit[]>("/fit-categories/fits")
}

/** Crea un ajuste nuevo (la clave se genera en el servidor). */
export function createFit(name: string): Promise<Fit> {
  return apiFetch<Fit>("/fit-categories/fits", {
    method: "POST",
    body: { name },
  })
}

/** Elimina un ajuste (falla si hay productos que lo usan). */
export function deleteFit(id: string): Promise<void> {
  return apiFetch<void>(`/fit-categories/fits/${id}`, { method: "DELETE" })
}

export function deleteFitCategory(id: string): Promise<void> {
  return apiFetch<void>(`/fit-categories/${id}`, { method: "DELETE" })
}

// Llamadas al módulo de usuarios de la API (/api/users).
import { apiFetch } from "@/lib/api"
import type {
  CreateUserPayload,
  UpdateUserPayload,
  UserView,
} from "@/types/api"

/** Lista todos los usuarios con sus roles. */
export function listUsers(): Promise<UserView[]> {
  return apiFetch<UserView[]>("/users")
}

/** Obtiene un usuario por id. */
export function getUser(id: string): Promise<UserView> {
  return apiFetch<UserView>(`/users/${id}`)
}

export function createUser(body: CreateUserPayload): Promise<UserView> {
  return apiFetch<UserView>("/users", { method: "POST", body })
}

export function updateUser(
  id: string,
  body: UpdateUserPayload
): Promise<UserView> {
  return apiFetch<UserView>(`/users/${id}`, { method: "PATCH", body })
}

export function deleteUser(id: string): Promise<void> {
  return apiFetch<void>(`/users/${id}`, { method: "DELETE" })
}

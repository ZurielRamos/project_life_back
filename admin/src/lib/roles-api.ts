// Llamadas al módulo de roles de la API (/api/roles).
import { apiFetch } from "@/lib/api"
import type {
  CreateRolePayload,
  Role,
  UpdateRolePayload,
} from "@/types/api"

/** Lista todos los roles con sus permisos resueltos. */
export function listRoles(): Promise<Role[]> {
  return apiFetch<Role[]>("/roles")
}

/** Obtiene un rol por id. */
export function getRole(id: string): Promise<Role> {
  return apiFetch<Role>(`/roles/${id}`)
}

export function createRole(body: CreateRolePayload): Promise<Role> {
  return apiFetch<Role>("/roles", { method: "POST", body })
}

export function updateRole(
  id: string,
  body: UpdateRolePayload
): Promise<Role> {
  return apiFetch<Role>(`/roles/${id}`, { method: "PATCH", body })
}

export function deleteRole(id: string): Promise<void> {
  return apiFetch<void>(`/roles/${id}`, { method: "DELETE" })
}

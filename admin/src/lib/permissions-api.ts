// Llamadas al módulo de permisos de la API (/api/permissions).
import { apiFetch } from "@/lib/api"
import type { Permission } from "@/types/api"

/** Lista el catálogo completo de permisos del sistema (orden alfabético). */
export function listPermissions(): Promise<Permission[]> {
  return apiFetch<Permission[]>("/permissions")
}

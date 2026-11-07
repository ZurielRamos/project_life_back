import { useEffect, useMemo, useState, type FormEvent } from "react"
import { Loader2 } from "lucide-react"

import { ApiError } from "@/lib/api"
import { createRole, updateRole } from "@/lib/roles-api"
import type { Permission, Role } from "@/types/api"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface RoleFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Catálogo completo de permisos disponibles. */
  permissions: Permission[]
  /** Si se pasa, el diálogo entra en modo edición. */
  role?: Role | null
  /** Se llama con el rol creado/actualizado tras el éxito. */
  onSaved: (role: Role) => void
}

export function RoleFormDialog({
  open,
  onOpenChange,
  permissions,
  role,
  onSaved,
}: RoleFormDialogProps) {
  const isEdit = Boolean(role)
  // Los roles de sistema (ej. "admin") no se pueden renombrar.
  const lockName = Boolean(role?.isSystem)

  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [permissionIds, setPermissionIds] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Agrupa los permisos por recurso para presentarlos de forma legible.
  const groups = useMemo(() => {
    const map = new Map<string, Permission[]>()
    for (const perm of permissions) {
      const list = map.get(perm.resource) ?? []
      list.push(perm)
      map.set(perm.resource, list)
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b))
  }, [permissions])

  useEffect(() => {
    if (!open) return
    setError(null)
    if (role) {
      setName(role.name)
      setDescription(role.description ?? "")
      setPermissionIds(role.permissions.map((p) => p.id))
    } else {
      setName("")
      setDescription("")
      setPermissionIds([])
    }
  }, [open, role])

  function togglePermission(id: string) {
    setPermissionIds((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    )
  }

  function toggleGroup(group: Permission[], checked: boolean) {
    const ids = group.map((p) => p.id)
    setPermissionIds((prev) => {
      const set = new Set(prev)
      if (checked) {
        ids.forEach((id) => set.add(id))
      } else {
        ids.forEach((id) => set.delete(id))
      }
      return Array.from(set)
    })
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setSaving(true)
    try {
      let saved: Role
      if (role) {
        saved = await updateRole(role.id, {
          // No enviamos el nombre si es un rol de sistema (bloqueado).
          name: lockName ? undefined : name.trim(),
          description: description.trim() || undefined,
          permissionIds,
        })
      } else {
        saved = await createRole({
          name: name.trim(),
          description: description.trim() || undefined,
          permissionIds,
        })
      }
      onSaved(saved)
      onOpenChange(false)
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : "No se pudo guardar el rol."
      setError(message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar rol" : "Nuevo rol"}</DialogTitle>
          <DialogDescription>
            Define el rol y marca los permisos que agrupa.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {error && (
            <div
              role="alert"
              className="border-destructive/50 bg-destructive/10 text-destructive rounded-md border px-3 py-2 text-sm"
            >
              {error}
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="role-name">Nombre</Label>
              <Input
                id="role-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="editor"
                minLength={2}
                maxLength={60}
                required
                disabled={lockName}
                autoFocus={!lockName}
              />
              {lockName && (
                <p className="text-xs text-neutral-400">
                  Es un rol del sistema; el nombre no se puede cambiar.
                </p>
              )}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="role-description">Descripción (opcional)</Label>
              <Input
                id="role-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Qué puede hacer este rol"
                maxLength={255}
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label>Permisos</Label>
            {groups.length === 0 ? (
              <p className="text-sm text-neutral-400">
                No hay permisos en el catálogo.
              </p>
            ) : (
              <div className="flex max-h-[45vh] flex-col gap-4 overflow-y-auto rounded-md border p-3">
                {groups.map(([resource, group]) => {
                  const allChecked = group.every((p) =>
                    permissionIds.includes(p.id)
                  )
                  return (
                    <div key={resource} className="flex flex-col gap-1.5">
                      <label className="flex items-center gap-2 text-sm font-semibold text-neutral-900">
                        <input
                          type="checkbox"
                          checked={allChecked}
                          onChange={(e) =>
                            toggleGroup(group, e.target.checked)
                          }
                          className="size-4 rounded border-neutral-300"
                        />
                        <span className="capitalize">{resource}</span>
                      </label>
                      <div className="grid grid-cols-1 gap-1 pl-6 sm:grid-cols-2">
                        {group.map((perm) => (
                          <label
                            key={perm.id}
                            className="flex items-center gap-2 rounded px-1.5 py-1 text-sm hover:bg-neutral-100"
                            title={perm.description ?? perm.name}
                          >
                            <input
                              type="checkbox"
                              checked={permissionIds.includes(perm.id)}
                              onChange={() => togglePermission(perm.id)}
                              className="size-4 rounded border-neutral-300"
                            />
                            <span className="text-neutral-700">
                              {perm.action}
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
            <p className="text-xs text-neutral-400">
              {permissionIds.length} permiso(s) seleccionado(s)
            </p>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="size-4 animate-spin" />}
              {isEdit ? "Guardar" : "Crear rol"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

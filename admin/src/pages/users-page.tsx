import { useCallback, useEffect, useState } from "react"
import {
  Loader2,
  Pencil,
  Plus,
  ShieldCheck,
  Trash2,
  Users as UsersIcon,
} from "lucide-react"

import { ApiError } from "@/lib/api"
import { deleteUser, listUsers } from "@/lib/users-api"
import { deleteRole, listRoles } from "@/lib/roles-api"
import { listPermissions } from "@/lib/permissions-api"
import { useAuth } from "@/hooks/use-auth"
import type { Permission, Role, UserView } from "@/types/api"
import { cn } from "@/lib/utils"
import { AppHeader } from "@/components/app-header"
import { UserAvatar } from "@/components/user-avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { UserFormDialog } from "@/components/users/user-form-dialog"
import { RoleFormDialog } from "@/components/users/role-form-dialog"

type Tab = "users" | "roles"

export function UsersPage() {
  const { user } = useAuth()
  const can = useCallback(
    (permission: string) => user?.permissions.includes(permission) ?? false,
    [user]
  )

  const [tab, setTab] = useState<Tab>("users")

  const [users, setUsers] = useState<UserView[]>([])
  const [roles, setRoles] = useState<Role[]>([])
  const [permissions, setPermissions] = useState<Permission[]>([])

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Diálogos (null = cerrado; undefined dentro de edit = crear).
  const [userDialogOpen, setUserDialogOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<UserView | null>(null)
  const [roleDialogOpen, setRoleDialogOpen] = useState(false)
  const [editingRole, setEditingRole] = useState<Role | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      // Pedimos en paralelo lo que el usuario tenga permiso de leer.
      const [usersData, rolesData, permsData] = await Promise.all([
        listUsers().catch(() => [] as UserView[]),
        listRoles().catch(() => [] as Role[]),
        listPermissions().catch(() => [] as Permission[]),
      ])
      setUsers(usersData)
      setRoles(rolesData)
      setPermissions(permsData)
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : "No se pudieron cargar los datos."
      setError(message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  // --- Usuarios ---

  function openCreateUser() {
    setEditingUser(null)
    setUserDialogOpen(true)
  }

  function openEditUser(target: UserView) {
    setEditingUser(target)
    setUserDialogOpen(true)
  }

  function onUserSaved(saved: UserView) {
    setUsers((prev) => {
      const exists = prev.some((u) => u.id === saved.id)
      return exists
        ? prev.map((u) => (u.id === saved.id ? saved : u))
        : [saved, ...prev]
    })
  }

  async function handleDeleteUser(target: UserView) {
    if (
      !window.confirm(`¿Eliminar al usuario "${target.email}"?`)
    ) {
      return
    }
    try {
      await deleteUser(target.id)
      setUsers((prev) => prev.filter((u) => u.id !== target.id))
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : "No se pudo eliminar el usuario."
      window.alert(message)
    }
  }

  // --- Roles ---

  function openCreateRole() {
    setEditingRole(null)
    setRoleDialogOpen(true)
  }

  function openEditRole(target: Role) {
    setEditingRole(target)
    setRoleDialogOpen(true)
  }

  function onRoleSaved(saved: Role) {
    setRoles((prev) => {
      const exists = prev.some((r) => r.id === saved.id)
      return exists
        ? prev.map((r) => (r.id === saved.id ? saved : r))
        : [saved, ...prev]
    })
  }

  async function handleDeleteRole(target: Role) {
    if (!window.confirm(`¿Eliminar el rol "${target.name}"?`)) {
      return
    }
    try {
      await deleteRole(target.id)
      setRoles((prev) => prev.filter((r) => r.id !== target.id))
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : "No se pudo eliminar el rol."
      window.alert(message)
    }
  }

  const tabs: { id: Tab; label: string; icon: typeof UsersIcon }[] = [
    { id: "users", label: "Usuarios", icon: UsersIcon },
    { id: "roles", label: "Roles y permisos", icon: ShieldCheck },
  ]

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-6 p-6">
      <AppHeader
        title="Usuarios"
        description="Gestiona usuarios, roles y los permisos que cada rol agrupa."
        team={users}
        actions={
          <>
            {tab === "users" && can("users:create") && (
              <Button onClick={openCreateUser}>
                <Plus className="size-4" />
                Nuevo usuario
              </Button>
            )}
            {tab === "roles" && can("roles:create") && (
              <Button onClick={openCreateRole}>
                <Plus className="size-4" />
                Nuevo rol
              </Button>
            )}
          </>
        }
      />

      {/* Pestañas */}
      <div className="flex gap-1 border-b border-neutral-200">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={cn(
              "flex items-center gap-2 border-b-2 px-4 py-2 text-sm font-medium transition-colors",
              tab === id
                ? "border-neutral-900 text-neutral-900"
                : "border-transparent text-neutral-500 hover:text-neutral-800"
            )}
          >
            <Icon className="size-4" />
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex flex-1 items-center justify-center">
          <Loader2 className="size-6 animate-spin text-neutral-400" />
        </div>
      ) : error ? (
        <div
          role="alert"
          className="border-destructive/50 bg-destructive/10 text-destructive rounded-md border px-4 py-3 text-sm"
        >
          {error}
        </div>
      ) : tab === "users" ? (
        <UsersTab
          users={users}
          canUpdate={can("users:update")}
          canDelete={can("users:delete")}
          onEdit={openEditUser}
          onDelete={handleDeleteUser}
          onCreate={openCreateUser}
          canCreate={can("users:create")}
        />
      ) : (
        <RolesTab
          roles={roles}
          canUpdate={can("roles:update")}
          canDelete={can("roles:delete")}
          onEdit={openEditRole}
          onDelete={handleDeleteRole}
          onCreate={openCreateRole}
          canCreate={can("roles:create")}
        />
      )}

      <UserFormDialog
        open={userDialogOpen}
        onOpenChange={setUserDialogOpen}
        roles={roles}
        user={editingUser}
        onSaved={onUserSaved}
      />

      <RoleFormDialog
        open={roleDialogOpen}
        onOpenChange={setRoleDialogOpen}
        permissions={permissions}
        role={editingRole}
        onSaved={onRoleSaved}
      />
    </div>
  )
}

// --- Pestaña de usuarios ---

interface UsersTabProps {
  users: UserView[]
  canUpdate: boolean
  canDelete: boolean
  canCreate: boolean
  onEdit: (user: UserView) => void
  onDelete: (user: UserView) => void
  onCreate: () => void
}

function UsersTab({
  users,
  canUpdate,
  canDelete,
  canCreate,
  onEdit,
  onDelete,
  onCreate,
}: UsersTabProps) {
  if (users.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center text-neutral-500">
        <UsersIcon className="size-10 text-neutral-300" />
        <p className="text-sm">Aún no hay usuarios.</p>
        {canCreate && (
          <Button variant="outline" onClick={onCreate}>
            <Plus className="size-4" />
            Crear el primero
          </Button>
        )}
      </div>
    )
  }

  return (
    <div className="overflow-x-auto rounded-xl border bg-white">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-neutral-50 text-left text-neutral-500">
            <th className="px-4 py-3 font-medium">Usuario</th>
            <th className="px-4 py-3 font-medium">Estado</th>
            <th className="px-4 py-3 font-medium">Roles</th>
            <th className="px-4 py-3 text-right font-medium">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr
              key={u.id}
              className="border-b last:border-0 hover:bg-neutral-50"
            >
              <td className="px-4 py-3">
                <div className="flex items-center gap-3">
                  <UserAvatar
                    name={u.name}
                    email={u.email}
                    avatarUrl={u.avatarUrl}
                    className="size-9"
                  />
                  <div className="min-w-0">
                    <div className="font-medium text-neutral-900">
                      {u.name || "—"}
                    </div>
                    <div className="text-xs text-neutral-500">{u.email}</div>
                  </div>
                </div>
              </td>
              <td className="px-4 py-3">
                <Badge variant={u.isActive ? "secondary" : "outline"}>
                  {u.isActive ? "Activo" : "Inactivo"}
                </Badge>
              </td>
              <td className="px-4 py-3">
                <div className="flex flex-wrap gap-1">
                  {u.roles.length === 0 ? (
                    <span className="text-xs text-neutral-400">Sin roles</span>
                  ) : (
                    u.roles.map((r) => (
                      <Badge key={r.id} variant="outline">
                        {r.name}
                      </Badge>
                    ))
                  )}
                </div>
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center justify-end gap-1">
                  {canUpdate && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onEdit(u)}
                      aria-label="Editar usuario"
                    >
                      <Pencil className="size-4" />
                    </Button>
                  )}
                  {canDelete && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onDelete(u)}
                      aria-label="Eliminar usuario"
                      className="text-red-500 hover:text-red-600"
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// --- Pestaña de roles ---

interface RolesTabProps {
  roles: Role[]
  canUpdate: boolean
  canDelete: boolean
  canCreate: boolean
  onEdit: (role: Role) => void
  onDelete: (role: Role) => void
  onCreate: () => void
}

function RolesTab({
  roles,
  canUpdate,
  canDelete,
  canCreate,
  onEdit,
  onDelete,
  onCreate,
}: RolesTabProps) {
  if (roles.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center text-neutral-500">
        <ShieldCheck className="size-10 text-neutral-300" />
        <p className="text-sm">Aún no hay roles.</p>
        {canCreate && (
          <Button variant="outline" onClick={onCreate}>
            <Plus className="size-4" />
            Crear el primero
          </Button>
        )}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {roles.map((role) => (
        <div
          key={role.id}
          className="flex flex-col gap-3 rounded-2xl border bg-white p-4"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="truncate font-semibold text-neutral-900">
                  {role.name}
                </h3>
                {role.isSystem && (
                  <Badge variant="secondary" className="shrink-0">
                    Sistema
                  </Badge>
                )}
              </div>
              {role.description && (
                <p className="line-clamp-2 text-sm text-neutral-500">
                  {role.description}
                </p>
              )}
            </div>
            <div className="flex shrink-0 items-center gap-1">
              {canUpdate && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onEdit(role)}
                  aria-label="Editar rol"
                >
                  <Pencil className="size-4" />
                </Button>
              )}
              {canDelete && !role.isSystem && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onDelete(role)}
                  aria-label="Eliminar rol"
                  className="text-red-500 hover:text-red-600"
                >
                  <Trash2 className="size-4" />
                </Button>
              )}
            </div>
          </div>

          <div className="mt-auto">
            <p className="mb-1.5 text-xs font-medium text-neutral-400">
              {role.permissions.length} permiso(s)
            </p>
            <div className="flex flex-wrap gap-1">
              {role.permissions.slice(0, 8).map((p) => (
                <Badge key={p.id} variant="outline" className="font-mono">
                  {p.name}
                </Badge>
              ))}
              {role.permissions.length > 8 && (
                <Badge variant="outline">
                  +{role.permissions.length - 8}
                </Badge>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

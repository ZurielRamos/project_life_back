import { useEffect, useState, type FormEvent } from "react"
import { Loader2, ShieldCheck, UserRound } from "lucide-react"

import { ApiError } from "@/lib/api"
import { updateUser } from "@/lib/users-api"
import { useAuth } from "@/hooks/use-auth"
import { AppHeader } from "@/components/app-header"
import { UserAvatar } from "@/components/user-avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

/**
 * Página de perfil del usuario autenticado. Muestra su identidad, roles y
 * permisos, y permite editar el nombre (se persiste vía PATCH /users/:id si
 * el backend lo autoriza).
 */
export function ProfilePage() {
  const { user, refresh } = useAuth()

  const [name, setName] = useState(user?.name ?? "")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  // Mantiene el campo en sync si el usuario del contexto cambia.
  useEffect(() => {
    setName(user?.name ?? "")
  }, [user?.name])

  if (!user) {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center">
        <Loader2 className="size-6 animate-spin text-neutral-400" />
      </div>
    )
  }

  const dirty = (name.trim() || null) !== (user.name ?? null)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!user) return
    setError(null)
    setSuccess(false)
    setSaving(true)
    try {
      await updateUser(user.id, { name: name.trim() })
      await refresh()
      setSuccess(true)
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : "No se pudo guardar el perfil."
      setError(message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto p-6">
      <AppHeader
        title="Mi perfil"
        description="Tu información de cuenta, roles y permisos."
      />

      <div className="grid max-w-4xl gap-6 lg:grid-cols-3">
        {/* Identidad + edición */}
        <section className="lg:col-span-2">
          <div className="rounded-2xl border bg-white p-6">
            <div className="flex items-center gap-4">
              <UserAvatar
                name={user.name}
                email={user.email}
                avatarUrl={user.avatarUrl}
                className="size-16 text-lg"
              />
              <div className="min-w-0">
                <h2 className="truncate text-lg font-semibold text-neutral-900">
                  {user.name || "Sin nombre"}
                </h2>
                <p className="text-muted-foreground truncate text-sm">
                  {user.email}
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
              {error && (
                <div
                  role="alert"
                  className="border-destructive/50 bg-destructive/10 text-destructive rounded-md border px-3 py-2 text-sm"
                >
                  {error}
                </div>
              )}
              {success && (
                <div
                  role="status"
                  className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700"
                >
                  Perfil actualizado.
                </div>
              )}

              <div className="grid gap-2">
                <Label htmlFor="name">Nombre</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Tu nombre"
                  className="h-10 rounded-xl"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="email">Correo electrónico</Label>
                <Input
                  id="email"
                  value={user.email}
                  disabled
                  className="h-10 rounded-xl"
                />
                <p className="text-muted-foreground text-xs">
                  El correo no se puede cambiar desde aquí.
                </p>
              </div>

              <div className="flex justify-end">
                <Button type="submit" disabled={!dirty || saving}>
                  {saving && <Loader2 className="size-4 animate-spin" />}
                  Guardar cambios
                </Button>
              </div>
            </form>
          </div>
        </section>

        {/* Roles y permisos */}
        <section className="flex flex-col gap-6">
          <div className="rounded-2xl border bg-white p-6">
            <div className="mb-3 flex items-center gap-2">
              <UserRound className="size-4 text-neutral-400" />
              <h3 className="font-semibold text-neutral-900">Roles</h3>
            </div>
            {user.roles.length === 0 ? (
              <p className="text-sm text-neutral-500">Sin roles asignados.</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {user.roles.map((role) => (
                  <Badge key={role} variant="secondary">
                    {role}
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-2xl border bg-white p-6">
            <div className="mb-3 flex items-center gap-2">
              <ShieldCheck className="size-4 text-neutral-400" />
              <h3 className="font-semibold text-neutral-900">Permisos</h3>
            </div>
            {user.permissions.length === 0 ? (
              <p className="text-sm text-neutral-500">Sin permisos.</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {user.permissions.map((perm) => (
                  <Badge key={perm} variant="outline" className="font-mono">
                    {perm}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}

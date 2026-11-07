import { useEffect, useState, type FormEvent } from "react"
import { Loader2 } from "lucide-react"

import { ApiError } from "@/lib/api"
import { createUser, updateUser } from "@/lib/users-api"
import type { Role, UserView } from "@/types/api"
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

interface UserFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Roles disponibles para asignar. */
  roles: Role[]
  /** Si se pasa, el diálogo entra en modo edición. */
  user?: UserView | null
  /** Se llama con el usuario creado/actualizado tras el éxito. */
  onSaved: (user: UserView) => void
}

export function UserFormDialog({
  open,
  onOpenChange,
  roles,
  user,
  onSaved,
}: UserFormDialogProps) {
  const isEdit = Boolean(user)

  const [email, setEmail] = useState("")
  const [name, setName] = useState("")
  const [password, setPassword] = useState("")
  const [isActive, setIsActive] = useState(true)
  const [roleIds, setRoleIds] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Sincroniza el estado del formulario cada vez que se abre o cambia el
  // usuario objetivo (modo edición vs creación).
  useEffect(() => {
    if (!open) return
    setError(null)
    setPassword("")
    if (user) {
      setEmail(user.email)
      setName(user.name ?? "")
      setIsActive(user.isActive)
      setRoleIds(user.roles.map((r) => r.id))
    } else {
      setEmail("")
      setName("")
      setIsActive(true)
      setRoleIds([])
    }
  }, [open, user])

  function toggleRole(id: string) {
    setRoleIds((prev) =>
      prev.includes(id) ? prev.filter((r) => r !== id) : [...prev, id]
    )
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setSaving(true)
    try {
      let saved: UserView
      if (user) {
        saved = await updateUser(user.id, {
          email: email.trim(),
          name: name.trim() || undefined,
          password: password.trim() || undefined,
          isActive,
          roleIds,
        })
      } else {
        saved = await createUser({
          email: email.trim(),
          password: password.trim(),
          name: name.trim() || undefined,
          roleIds,
        })
      }
      onSaved(saved)
      onOpenChange(false)
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : "No se pudo guardar el usuario."
      setError(message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Editar usuario" : "Nuevo usuario"}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Actualiza los datos del usuario y sus roles."
              : "Crea un usuario y asígnale uno o más roles."}
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

          <div className="grid gap-2">
            <Label htmlFor="user-email">Email</Label>
            <Input
              id="user-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="persona@inkttex.com"
              required
              autoFocus
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="user-name">Nombre (opcional)</Label>
            <Input
              id="user-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nombre y apellidos"
              maxLength={120}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="user-password">
              {isEdit ? "Nueva contraseña (opcional)" : "Contraseña"}
            </Label>
            <Input
              id="user-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={
                isEdit ? "Dejar en blanco para no cambiarla" : "Mínimo 8 caracteres"
              }
              minLength={8}
              maxLength={72}
              required={!isEdit}
              autoComplete="new-password"
            />
          </div>

          {isEdit && (
            <label className="flex items-center gap-2 text-sm text-neutral-700">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="size-4 rounded border-neutral-300"
              />
              Cuenta activa
            </label>
          )}

          <div className="grid gap-2">
            <Label>Roles</Label>
            {roles.length === 0 ? (
              <p className="text-sm text-neutral-400">
                No hay roles disponibles. Crea uno primero.
              </p>
            ) : (
              <div className="flex max-h-48 flex-col gap-1.5 overflow-y-auto rounded-md border p-2">
                {roles.map((role) => (
                  <label
                    key={role.id}
                    className="flex items-center gap-2 rounded px-1.5 py-1 text-sm hover:bg-neutral-100"
                  >
                    <input
                      type="checkbox"
                      checked={roleIds.includes(role.id)}
                      onChange={() => toggleRole(role.id)}
                      className="size-4 rounded border-neutral-300"
                    />
                    <span className="font-medium text-neutral-900">
                      {role.name}
                    </span>
                    {role.description && (
                      <span className="truncate text-xs text-neutral-400">
                        {role.description}
                      </span>
                    )}
                  </label>
                ))}
              </div>
            )}
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
              {isEdit ? "Guardar" : "Crear usuario"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

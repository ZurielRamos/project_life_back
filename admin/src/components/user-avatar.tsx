import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"

/**
 * Paleta de fondos para el avatar generado. Se elige de forma determinista a
 * partir del nombre, de modo que un mismo usuario siempre tenga el mismo color.
 * Usa tonos de marca (teal / púrpura / amarillo) y algunos neutros cálidos.
 */
const AVATAR_PALETTE = [
  "bg-brand-teal/25 text-teal-900",
  "bg-brand-purple/25 text-purple-900",
  "bg-brand-yellow/40 text-yellow-900",
  "bg-sky-200 text-sky-900",
  "bg-rose-200 text-rose-900",
  "bg-emerald-200 text-emerald-900",
  "bg-orange-200 text-orange-900",
  "bg-indigo-200 text-indigo-900",
]

/** Hash estable (djb2) para derivar un índice de color desde un string. */
function hashString(value: string): number {
  let hash = 5381
  for (let i = 0; i < value.length; i++) {
    hash = (hash * 33) ^ value.charCodeAt(i)
  }
  return Math.abs(hash)
}

/** Deriva hasta dos iniciales a partir de un nombre o correo. */
export function initialsOf(nameOrEmail: string): string {
  const source = (nameOrEmail ?? "").trim()
  if (!source) return "?"
  // Si parece un correo, usa la parte local antes de la @.
  const base = source.includes("@") ? source.split("@")[0] : source
  const parts = base.split(/[\s._-]+/).filter(Boolean)
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase()
  }
  return base.slice(0, 2).toUpperCase()
}

interface UserAvatarProps {
  /** Nombre a mostrar; si falta, se usa el correo. */
  name?: string | null
  /** Correo, usado como respaldo para iniciales/color. */
  email?: string | null
  /** URL de imagen de avatar (opcional). Si existe, tiene prioridad. */
  avatarUrl?: string | null
  className?: string
}

/**
 * Avatar de usuario reutilizable. Muestra la imagen si hay `avatarUrl`; de lo
 * contrario genera un avatar con iniciales sobre un color estable por usuario.
 */
export function UserAvatar({
  name,
  email,
  avatarUrl,
  className,
}: UserAvatarProps) {
  const label = name || email || "Usuario"
  const seed = email || name || label
  const color = AVATAR_PALETTE[hashString(seed) % AVATAR_PALETTE.length]

  return (
    <Avatar className={cn("size-8", className)}>
      {avatarUrl && <AvatarImage src={avatarUrl} alt={label} />}
      <AvatarFallback
        className={cn("text-xs font-semibold", color)}
        title={label}
      >
        {initialsOf(label)}
      </AvatarFallback>
    </Avatar>
  )
}

import type { ReactNode } from "react"
import { Bell, Settings, type LucideIcon } from "lucide-react"

import { UserAvatar } from "@/components/user-avatar"
import { UserMenu } from "@/components/user-menu"

interface IconButtonProps {
  icon: LucideIcon
  label: string
}

/** Botón circular de acción del header (notificaciones, ajustes, …). */
function IconButton({ icon: Icon, label }: IconButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      className="flex size-10 items-center justify-center rounded-full border bg-white text-neutral-600 hover:text-neutral-900"
    >
      <Icon className="size-4" />
    </button>
  )
}

/** Forma mínima de usuario que necesita el cluster de avatares del header. */
export interface HeaderUser {
  id: string
  name?: string | null
  email?: string | null
  avatarUrl?: string | null
}

interface AppHeaderProps {
  /** Título principal de la pantalla. */
  title: string
  /** Subtítulo opcional bajo el título. */
  description?: string
  /** Contenido antes del título (p. ej. un botón de "volver"). */
  leading?: ReactNode
  /** Acción específica de la página (p. ej. "Nuevo producto"). */
  actions?: ReactNode
  /**
   * Colaboradores a mostrar como cluster de avatares (opcional). Si no se
   * pasa, no se muestra ningún placeholder.
   */
  team?: HeaderUser[]
}

/** Nº máximo de avatares del equipo antes de resumir con "+N". */
const MAX_TEAM_AVATARS = 4

/**
 * Header común de la app. Conserva la estructura del header del Home:
 * título a la izquierda y, a la derecha, la acción propia de la página
 * seguida del cluster compartido (notificaciones, ajustes, equipo, perfil).
 */
export function AppHeader({
  title,
  description,
  leading,
  actions,
  team,
}: AppHeaderProps) {
  const visibleTeam = team?.slice(0, MAX_TEAM_AVATARS) ?? []
  const extraTeam = (team?.length ?? 0) - visibleTeam.length

  return (
    <header className="flex items-center justify-between gap-4">
      <div className="flex min-w-0 items-center gap-3">
        {leading}
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-bold text-neutral-900">
            {title}
          </h1>
          {description && (
            <p className="truncate text-sm text-neutral-500">{description}</p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3">
        {actions}

        <IconButton icon={Bell} label="Notificaciones" />
        <IconButton icon={Settings} label="Ajustes" />

        {/* Cluster de colaboradores (solo si se proveen) */}
        {visibleTeam.length > 0 && (
          <div className="hidden items-center rounded-full border bg-white py-1 pr-2 pl-2 sm:flex">
            <div className="flex -space-x-2">
              {visibleTeam.map((member) => (
                <UserAvatar
                  key={member.id}
                  name={member.name}
                  email={member.email}
                  avatarUrl={member.avatarUrl}
                  className="size-7 ring-2 ring-white"
                />
              ))}
            </div>
            {extraTeam > 0 && (
              <span className="ml-2 text-xs font-medium text-neutral-500">
                +{extraTeam}
              </span>
            )}
          </div>
        )}

        {/* Perfil del usuario autenticado */}
        <UserMenu />
      </div>
    </header>
  )
}

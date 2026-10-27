import {
  Bell,
  ChevronsUpDown,
  Settings,
  UserPlus,
  type LucideIcon,
} from "lucide-react"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"

interface IconButtonProps {
  icon: LucideIcon
  label: string
}

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

const teamInitials = ["AL", "MR", "JS"]

export function PosHeader() {
  return (
    <header className="flex items-center justify-between">
      <h1 className="text-2xl font-bold text-neutral-900">Create Transaction</h1>

      <div className="flex items-center gap-3">
        <IconButton icon={Bell} label="Notificaciones" />
        <IconButton icon={Settings} label="Ajustes" />

        {/* Avatares del equipo */}
        <div className="flex items-center rounded-full border bg-white py-1 pl-2 pr-1">
          <div className="flex -space-x-2">
            {teamInitials.map((initials, i) => (
              <Avatar
                key={initials}
                className={cn(
                  "size-7 border-2 border-white",
                  i === 0 && "bg-lime-200",
                  i === 1 && "bg-orange-200",
                  i === 2 && "bg-sky-200"
                )}
              >
                <AvatarFallback className="bg-transparent text-[10px] font-semibold text-neutral-700">
                  {initials}
                </AvatarFallback>
              </Avatar>
            ))}
          </div>
        </div>

        {/* New Access */}
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-full border bg-white px-4 py-2.5 text-sm font-medium text-neutral-700 hover:text-neutral-900"
        >
          <UserPlus className="size-4" />
          New Access
        </button>

        {/* Perfil */}
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-full border bg-white py-1 pl-1 pr-2"
        >
          <Avatar className="size-8 bg-neutral-200">
            <AvatarFallback className="bg-transparent text-xs font-semibold text-neutral-700">
              KA
            </AvatarFallback>
          </Avatar>
          <ChevronsUpDown className="size-4 text-neutral-400" />
        </button>
      </div>
    </header>
  )
}

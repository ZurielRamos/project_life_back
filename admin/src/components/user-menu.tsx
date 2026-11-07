import { useEffect, useRef, useState } from "react"
import { useNavigate } from "react-router-dom"
import { ChevronsUpDown, LogOut, Settings, User } from "lucide-react"

import { useAuth } from "@/hooks/use-auth"
import { UserAvatar } from "@/components/user-avatar"
import { cn } from "@/lib/utils"

/**
 * Botón de perfil del header con un menú desplegable. Construido sin
 * dependencias extra (mismo enfoque que el Combobox): overlay propio que se
 * cierra al hacer clic fuera o con Escape.
 */
export function UserMenu() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()

  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const name = user?.name || user?.email || "Invitado"
  const email = user?.email ?? ""

  // Cierra al hacer clic fuera.
  useEffect(() => {
    if (!open) return
    function onPointerDown(e: MouseEvent) {
      const target = e.target as Node
      if (containerRef.current && !containerRef.current.contains(target)) {
        setOpen(false)
      }
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false)
    }
    document.addEventListener("mousedown", onPointerDown)
    document.addEventListener("keydown", onKeyDown)
    return () => {
      document.removeEventListener("mousedown", onPointerDown)
      document.removeEventListener("keydown", onKeyDown)
    }
  }, [open])

  function go(path: string) {
    setOpen(false)
    navigate(path)
  }

  function handleSignOut() {
    setOpen(false)
    signOut()
    navigate("/login", { replace: true })
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        title={name}
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-2 rounded-full border bg-white py-1 pr-2 pl-1 transition-colors hover:bg-neutral-50"
      >
        <UserAvatar
          name={user?.name}
          email={user?.email}
          avatarUrl={user?.avatarUrl}
        />
        <ChevronsUpDown className="size-4 text-neutral-400" />
      </button>

      {open && (
        <div
          role="menu"
          aria-label="Menú de usuario"
          className="bg-popover text-popover-foreground absolute right-0 z-50 mt-2 w-60 overflow-hidden rounded-xl border p-1 shadow-md"
        >
          {/* Cabecera con identidad */}
          <div className="flex items-center gap-3 px-2 py-2.5">
            <UserAvatar
              name={user?.name}
              email={user?.email}
              avatarUrl={user?.avatarUrl}
              className="size-9"
            />
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-neutral-900">
                {name}
              </p>
              {email && (
                <p className="text-muted-foreground truncate text-xs">
                  {email}
                </p>
              )}
            </div>
          </div>

          <div className="bg-border my-1 h-px" />

          <MenuItem icon={User} label="Mi perfil" onClick={() => go("/profile")} />
          <MenuItem
            icon={Settings}
            label="Ajustes"
            onClick={() => go("/profile")}
          />

          <div className="bg-border my-1 h-px" />

          <MenuItem
            icon={LogOut}
            label="Cerrar sesión"
            onClick={handleSignOut}
            variant="danger"
          />
        </div>
      )}
    </div>
  )
}

interface MenuItemProps {
  icon: typeof User
  label: string
  onClick: () => void
  variant?: "default" | "danger"
}

function MenuItem({ icon: Icon, label, onClick, variant = "default" }: MenuItemProps) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm transition-colors",
        variant === "danger"
          ? "text-red-600 hover:bg-red-50"
          : "text-neutral-700 hover:bg-accent hover:text-accent-foreground"
      )}
    >
      <Icon className="size-4" />
      {label}
    </button>
  )
}

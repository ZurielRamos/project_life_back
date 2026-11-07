import {
  Home,
  LogOut,
  Package,
  Palette,
  SlidersHorizontal,
  Store,
  Users,
  type LucideIcon,
} from "lucide-react"
import { NavLink } from "react-router-dom"

import { cn } from "@/lib/utils"
import { useAuth } from "@/hooks/use-auth"
import logoInkttex from "@/assets/logo-inkttex.svg"

interface NavItem {
  to: string
  label: string
  icon: LucideIcon
  end?: boolean
}

const navItems: NavItem[] = [
  { to: "/", label: "Inicio", icon: Home, end: true },
  { to: "/products", label: "Productos", icon: Package },
  { to: "/designs", label: "Diseños", icon: Palette },
  { to: "/stores", label: "Tiendas", icon: Store },
  { to: "/users", label: "Usuarios", icon: Users },
  { to: "/settings", label: "Ajustes", icon: SlidersHorizontal },
]

export function AppSidebar() {
  const { signOut } = useAuth()

  return (
    <aside className="bg-neutral-950 flex w-16 flex-col items-center gap-1 py-5">
      {/* Logo */}
      <div className="mb-4 flex size-10 items-center justify-center">
        <img src={logoInkttex} alt="Inkttex" className="size-10" />
      </div>

      <nav className="flex flex-1 flex-col items-center gap-1">
        {navItems.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            title={label}
            aria-label={label}
            className={({ isActive }) =>
              cn(
                "flex size-10 items-center justify-center rounded-xl transition-colors",
                isActive
                  ? "bg-brand-teal text-neutral-900"
                  : "text-neutral-400 hover:bg-neutral-800 hover:text-neutral-100"
              )
            }
          >
            <Icon className="size-5" />
          </NavLink>
        ))}
      </nav>

      <button
        type="button"
        onClick={signOut}
        title="Cerrar sesión"
        aria-label="Cerrar sesión"
        className="flex size-10 items-center justify-center rounded-xl text-red-500 transition-colors hover:bg-red-500/10"
      >
        <LogOut className="size-5" />
      </button>
    </aside>
  )
}

import { Loader2 } from "lucide-react"
import { Navigate, Outlet, useLocation } from "react-router-dom"

import { useAuth } from "@/hooks/use-auth"

export function ProtectedRoute() {
  const { isAuthenticated, loading } = useAuth()
  const location = useLocation()

  // Mientras se rehidrata el token no decidimos nada, para evitar
  // un parpadeo de redirección al login.
  if (loading) {
    return (
      <div className="flex min-h-svh w-full items-center justify-center">
        <Loader2 className="text-muted-foreground size-6 animate-spin" />
      </div>
    )
  }

  if (!isAuthenticated) {
    // Guardamos la ruta original para volver tras el login.
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  return <Outlet />
}

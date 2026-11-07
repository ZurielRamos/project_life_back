import { Navigate } from "react-router-dom"

import { useAuth } from "@/hooks/use-auth"
import { LoginForm } from "@/components/login-form"

export function LoginPage() {
  const { isAuthenticated, loading } = useAuth()

  // Si ya hay sesión, no mostramos el login.
  if (!loading && isAuthenticated) {
    return <Navigate to="/" replace />
  }

  return (
    <div className="relative flex min-h-svh w-full items-center justify-center overflow-hidden bg-neutral-100 p-4 md:p-10">
      {/* Fondo ambiental de marca */}
      <div className="pointer-events-none absolute inset-0">
        <div className="bg-brand-teal/30 absolute -top-32 -left-24 size-96 rounded-full blur-3xl" />
        <div className="bg-brand-purple/30 absolute -right-24 -bottom-32 size-96 rounded-full blur-3xl" />
        <div className="bg-brand-yellow/20 absolute top-1/3 left-1/2 size-80 -translate-x-1/2 rounded-full blur-3xl" />
      </div>

      <LoginForm className="relative" />
    </div>
  )
}

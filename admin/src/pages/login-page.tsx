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
    <div className="bg-muted flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <LoginForm />
      </div>
    </div>
  )
}

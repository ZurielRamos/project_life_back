import { useState, type ComponentProps, type FormEvent } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import { Loader2 } from "lucide-react"

import { cn } from "@/lib/utils"
import { ApiError } from "@/lib/api"
import { useAuth } from "@/hooks/use-auth"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

/** Estado de navegación que deja ProtectedRoute al redirigir al login. */
interface LocationState {
  from?: { pathname?: string }
}

export function LoginForm({ className, ...props }: ComponentProps<"div">) {
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Ruta a la que el usuario intentaba entrar antes de ser redirigido al login.
  const state = location.state as LocationState | null
  const from = state?.from?.pathname ?? "/"

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)

    const form = new FormData(event.currentTarget)
    const email = String(form.get("email") ?? "")
    const password = String(form.get("password") ?? "")

    setLoading(true)
    try {
      await signIn({ email, password })
      navigate(from, { replace: true })
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : "No se pudo iniciar sesión. Intenta de nuevo."
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-xl">Bienvenido de nuevo</CardTitle>
          <CardDescription>
            Ingresa tus credenciales para acceder al panel
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit}>
            <div className="flex flex-col gap-6">
              {error && (
                <div
                  role="alert"
                  className="border-destructive/50 bg-destructive/10 text-destructive rounded-md border px-3 py-2 text-sm"
                >
                  {error}
                </div>
              )}
              <div className="grid gap-2">
                <Label htmlFor="email">Correo electrónico</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="tucorreo@ejemplo.com"
                  autoComplete="email"
                  required
                />
              </div>
              <div className="grid gap-2">
                <div className="flex items-center">
                  <Label htmlFor="password">Contraseña</Label>
                  <a
                    href="#"
                    className="ml-auto text-sm underline-offset-4 hover:underline"
                  >
                    ¿Olvidaste tu contraseña?
                  </a>
                </div>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading && <Loader2 className="animate-spin" />}
                Iniciar sesión
              </Button>
            </div>
          </form>
        </CardContent>
        <CardFooter className="justify-center">
          <p className="text-muted-foreground text-sm">
            ¿No tienes una cuenta?{" "}
            <a href="#" className="text-primary underline-offset-4 hover:underline">
              Regístrate
            </a>
          </p>
        </CardFooter>
      </Card>
    </div>
  )
}

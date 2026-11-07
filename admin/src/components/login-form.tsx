import { useState, type ComponentProps, type FormEvent } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import { Eye, EyeOff, Loader2 } from "lucide-react"

import { cn } from "@/lib/utils"
import { ApiError } from "@/lib/api"
import { useAuth } from "@/hooks/use-auth"
import logoMark from "@/assets/logo-inkttex-mark.svg"
import loginHero from "@/assets/login-hero.svg"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

/** Estado de navegación que deja ProtectedRoute al redirigir al login. */
interface LocationState {
  from?: { pathname?: string }
}

/** Avatares de muestra para la tarjeta de prueba social. */
const SAMPLE_USERS = [
  { name: "Ana", src: "https://i.pravatar.cc/80?img=12" },
  { name: "Luis", src: "https://i.pravatar.cc/80?img=33" },
  { name: "Marta", src: "https://i.pravatar.cc/80?img=47" },
]

/** Clave de localStorage para el correo recordado por "Recordarme". */
const REMEMBER_KEY = "inkttex.admin.rememberedEmail"

export function LoginForm({ className, ...props }: ComponentProps<"div">) {
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  // Correo recordado de una sesión anterior (si el usuario marcó "Recordarme").
  const rememberedEmail =
    typeof window !== "undefined"
      ? (localStorage.getItem(REMEMBER_KEY) ?? "")
      : ""

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [email, setEmail] = useState(rememberedEmail)
  const [remember, setRemember] = useState(Boolean(rememberedEmail))

  // Ruta a la que el usuario intentaba entrar antes de ser redirigido al login.
  const state = location.state as LocationState | null
  const from = state?.from?.pathname ?? "/"

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)

    const form = new FormData(event.currentTarget)
    const emailValue = String(form.get("email") ?? "")
    const password = String(form.get("password") ?? "")

    setLoading(true)
    try {
      await signIn({ email: emailValue, password })
      // "Recordarme": guardamos (o limpiamos) el correo para la próxima visita.
      if (remember) {
        localStorage.setItem(REMEMBER_KEY, emailValue)
      } else {
        localStorage.removeItem(REMEMBER_KEY)
      }
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
    <div className={cn("w-full max-w-5xl", className)} {...props}>
      <div className="bg-background/70 grid overflow-hidden rounded-3xl border border-white/40 shadow-2xl backdrop-blur-xl md:grid-cols-2">
        {/* Panel izquierdo: hero de marca */}
        <aside className="relative hidden min-h-[560px] flex-col justify-between overflow-hidden p-10 text-white md:flex">
          <img
            src={loginHero}
            alt=""
            aria-hidden
            className="absolute inset-0 size-full object-cover"
          />
          <div className="relative">
            <h1 className="text-6xl leading-[0.9] font-extrabold tracking-tight drop-shadow-sm">
              INKTTEX
              <span className="block text-3xl font-semibold tracking-[0.2em] opacity-80">
                STUDIO
              </span>
            </h1>
          </div>

          <div className="relative max-w-sm">
            <h2 className="text-2xl font-bold drop-shadow-sm">
              Diseña, imprime, vende
            </h2>
            <p className="mt-2 text-sm text-white/85 drop-shadow-sm">
              Gestiona tu catálogo, tus diseños y tus áreas de impresión desde un
              único panel pensado para equipos creativos.
            </p>
          </div>
        </aside>

        {/* Panel derecho: formulario */}
        <section className="flex flex-col gap-6 p-8 md:p-10">
          <img src={logoMark} alt="Inkttex" className="size-20 object-contain" />

          <div>
            <h2 className="text-3xl font-bold tracking-tight">Bienvenido de nuevo</h2>
            <p className="text-muted-foreground mt-1 text-sm">
              Inicia sesión para acceder a tu panel de Inkttex
            </p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
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
                className="h-11 rounded-xl"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="password">Contraseña</Label>
              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  className="h-11 rounded-xl pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                  className="text-muted-foreground hover:text-foreground absolute inset-y-0 right-0 flex w-10 items-center justify-center"
                >
                  {showPassword ? (
                    <EyeOff className="size-4" />
                  ) : (
                    <Eye className="size-4" />
                  )}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="remember" className="font-normal">
                <input
                  id="remember"
                  name="remember"
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  className="accent-primary size-4 rounded border"
                />
                Recordarme
              </Label>
              <a
                href="#"
                className="text-primary text-sm underline-offset-4 hover:underline"
              >
                ¿Olvidaste tu contraseña?
              </a>
            </div>

            <Button
              type="submit"
              className="h-11 rounded-xl text-base"
              disabled={loading}
            >
              {loading && <Loader2 className="animate-spin" />}
              Iniciar sesión
            </Button>

            <div className="flex items-center gap-3">
              <span className="bg-border h-px flex-1" />
              <span className="text-muted-foreground text-xs">O continúa con</span>
              <span className="bg-border h-px flex-1" />
            </div>

            <Button
              type="button"
              variant="outline"
              className="h-11 rounded-xl"
            >
              <GoogleIcon className="size-4" />
              Google
            </Button>

            <p className="text-muted-foreground text-center text-sm">
              ¿No tienes una cuenta?{" "}
              <a
                href="#"
                className="text-primary font-medium underline-offset-4 hover:underline"
              >
                Regístrate
              </a>
            </p>
          </form>

          {/* Prueba social */}
          <div className="bg-muted/60 mt-auto flex items-center gap-3 rounded-2xl border p-3">
            <div className="flex -space-x-2">
              {SAMPLE_USERS.map((user) => (
                <Avatar key={user.name} className="ring-background size-8 ring-2">
                  <AvatarImage src={user.src} alt={user.name} />
                  <AvatarFallback>{user.name[0]}</AvatarFallback>
                </Avatar>
              ))}
            </div>
            <div className="text-sm leading-tight">
              <p className="font-semibold">+10.000 diseños</p>
              <p className="text-muted-foreground text-xs">publicados con Inkttex</p>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}

/** Logotipo de Google con sus colores de marca. */
function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden>
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.76h3.57c2.08-1.92 3.28-4.74 3.28-8.09Z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.76c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.11a6.6 6.6 0 0 1 0-4.22V7.05H2.18a11 11 0 0 0 0 9.9l3.66-2.84Z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.05l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38Z"
      />
    </svg>
  )
}

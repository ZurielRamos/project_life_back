import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"

import { clearToken, getToken, setToken } from "@/lib/api"
import { getMe, login as loginRequest } from "@/lib/auth-api"
import { AuthContext, type AuthContextValue } from "@/context/auth-context"
import type { AuthResult, AuthenticatedUser, LoginPayload } from "@/types/api"

interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<AuthenticatedUser | null>(null)
  // "loading" cubre la rehidratación inicial del token al montar la app.
  const [loading, setLoading] = useState(true)

  // Al cargar, si hay token intentamos recuperar el usuario con /auth/me.
  useEffect(() => {
    let active = true

    async function bootstrap() {
      if (!getToken()) {
        setLoading(false)
        return
      }
      try {
        const me = await getMe()
        if (active) setUser(me)
      } catch {
        // Token inválido o expirado: lo limpiamos.
        clearToken()
        if (active) setUser(null)
      } finally {
        if (active) setLoading(false)
      }
    }

    void bootstrap()
    return () => {
      active = false
    }
  }, [])

  const signIn = useCallback(
    async ({ email, password }: LoginPayload): Promise<AuthResult> => {
      const result = await loginRequest({ email, password })
      setToken(result.accessToken)
      // El login devuelve el user (UserView). Para tener roles/permisos
      // resueltos consultamos /auth/me.
      try {
        const me = await getMe()
        setUser(me)
      } catch {
        // Fallback: adaptamos el UserView a la forma de AuthenticatedUser.
        setUser({
          id: result.user.id,
          email: result.user.email,
          name: result.user.name,
          roles: result.user.roles.map((role) => role.name),
          permissions: [],
        })
      }
      return result
    },
    []
  )

  const signOut = useCallback(() => {
    clearToken()
    setUser(null)
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      isAuthenticated: Boolean(user),
      signIn,
      signOut,
    }),
    [user, loading, signIn, signOut]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

import { createContext } from "react"

import type { AuthResult, AuthenticatedUser, LoginPayload } from "@/types/api"

/**
 * Valor expuesto por el contexto de autenticación.
 */
export interface AuthContextValue {
  user: AuthenticatedUser | null
  loading: boolean
  isAuthenticated: boolean
  signIn: (payload: LoginPayload) => Promise<AuthResult>
  signOut: () => void
}

/**
 * Contexto de autenticación. Expone el usuario actual, el estado de carga
 * inicial y las acciones de sign in / sign out.
 */
export const AuthContext = createContext<AuthContextValue | null>(null)

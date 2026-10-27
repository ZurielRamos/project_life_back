// Llamadas específicas al módulo de autenticación de la API.
import { apiFetch } from "@/lib/api"
import type {
  AuthenticatedUser,
  AuthResult,
  LoginPayload,
  RegisterPayload,
} from "@/types/api"

export function login({ email, password }: LoginPayload): Promise<AuthResult> {
  return apiFetch<AuthResult>("/auth/login", {
    method: "POST",
    body: { email, password },
  })
}

export function register({
  email,
  password,
  name,
}: RegisterPayload): Promise<AuthResult> {
  return apiFetch<AuthResult>("/auth/register", {
    method: "POST",
    body: { email, password, name },
  })
}

export function getMe(): Promise<AuthenticatedUser> {
  return apiFetch<AuthenticatedUser>("/auth/me")
}

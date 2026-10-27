// Cliente HTTP mínimo sobre fetch para consumir la API de NestJS.
// La base se toma de VITE_API_URL; en dev por defecto usa el proxy de Vite ("/api").

const API_URL = import.meta.env.VITE_API_URL ?? "/api"

const TOKEN_KEY = "kult.admin.token"

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token: string | null): void {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token)
  } else {
    localStorage.removeItem(TOKEN_KEY)
  }
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY)
}

/** Payload de error que puede devolver NestJS. */
interface ApiErrorBody {
  message?: string | string[]
  error?: string
  statusCode?: number
}

/**
 * Error enriquecido con el status HTTP y el payload del servidor.
 */
export class ApiError extends Error {
  readonly status: number
  readonly data: unknown

  constructor(message: string, status: number, data: unknown) {
    super(message)
    this.name = "ApiError"
    this.status = status
    this.data = data
  }
}

export type HttpMethod = "GET" | "POST" | "PATCH" | "PUT" | "DELETE"

export interface ApiRequestOptions {
  method?: HttpMethod
  body?: unknown
  headers?: Record<string, string>
}

/**
 * Realiza una petición a la API. Adjunta el token automáticamente
 * y normaliza los errores en ApiError.
 *
 * El genérico T describe la forma esperada de la respuesta.
 */
export async function apiFetch<T = unknown>(
  path: string,
  { method = "GET", body, headers }: ApiRequestOptions = {}
): Promise<T> {
  const token = getToken()

  const response = await fetch(`${API_URL}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })

  // 204 No Content u otras respuestas sin cuerpo.
  const isJson = response.headers
    .get("content-type")
    ?.includes("application/json")
  const data: unknown = isJson ? await response.json() : null

  if (!response.ok) {
    const errorBody = (data ?? {}) as ApiErrorBody
    const rawMessage =
      errorBody.message ||
      errorBody.error ||
      `Error ${response.status}: ${response.statusText}`
    // El message de NestJS puede ser un arreglo (errores de validación).
    const normalized = Array.isArray(rawMessage)
      ? rawMessage.join(", ")
      : rawMessage
    throw new ApiError(normalized, response.status, data)
  }

  return data as T
}

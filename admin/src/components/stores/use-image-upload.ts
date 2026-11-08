import { useState } from "react"

import { ApiError } from "@/lib/api"
import { uploadStoreAsset } from "@/lib/stores-api"

/** Reglas de validación de un campo de imagen. */
export interface UploadRules {
  /** Tipos MIME admitidos. */
  mimes: string[]
  /** Tamaño máximo en bytes. */
  maxBytes: number
  /** Texto para mostrar los formatos, p. ej. "PNG, JPG o SVG". */
  formats: string
}

export const LOGO_RULES: UploadRules = {
  mimes: ["image/png", "image/jpeg", "image/webp", "image/svg+xml"],
  maxBytes: 4 * 1024 * 1024,
  formats: "PNG, JPG, WEBP o SVG · máx. 4 MB",
}

export const FAVICON_RULES: UploadRules = {
  mimes: [
    "image/png",
    "image/svg+xml",
    "image/x-icon",
    "image/vnd.microsoft.icon",
  ],
  maxBytes: 512 * 1024,
  formats: "PNG, SVG o ICO · máx. 512 KB",
}

export const BANNER_RULES: UploadRules = {
  mimes: ["image/png", "image/jpeg", "image/webp", "image/gif", "image/avif"],
  maxBytes: 8 * 1024 * 1024,
  formats: "PNG, JPG, WEBP, GIF o AVIF · máx. 8 MB",
}

const BY_EXTENSION: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  gif: "image/gif",
  avif: "image/avif",
  svg: "image/svg+xml",
  ico: "image/x-icon",
}

/** Algunos navegadores no informan el tipo de .ico/.svg: se deduce del nombre. */
function resolveMime(file: File): string {
  if (file.type) return file.type
  const ext = file.name.split(".").pop()?.toLowerCase() ?? ""
  return BY_EXTENSION[ext] ?? ""
}

function readAsDataUri(file: File, mime: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () =>
      // Se fuerza el tipo detectado en el prefijo del data URI.
      resolve(String(reader.result).replace(/^data:[^;,]*/, `data:${mime}`))
    reader.onerror = () => reject(new Error("No se pudo leer el archivo"))
    reader.readAsDataURL(file)
  })
}

function formatBytes(bytes: number): string {
  return bytes >= 1024 * 1024
    ? `${Math.round(bytes / (1024 * 1024))} MB`
    : `${Math.round(bytes / 1024)} KB`
}

/** Valida y sube una imagen a la tienda; devuelve su URL pública. */
export function useImageUpload(storeId: string) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function upload(file: File, rules: UploadRules): Promise<string | null> {
    setError(null)
    const mime = resolveMime(file)
    if (!rules.mimes.includes(mime)) {
      setError(`Formato no admitido. Usa ${rules.formats.split(" · ")[0]}.`)
      return null
    }
    if (file.size > rules.maxBytes) {
      setError(`El archivo supera ${formatBytes(rules.maxBytes)}.`)
      return null
    }
    setUploading(true)
    try {
      const dataUri = await readAsDataUri(file, mime)
      const uploaded = await uploadStoreAsset(storeId, dataUri)
      return uploaded.url
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "No se pudo subir el archivo."
      )
      return null
    } finally {
      setUploading(false)
    }
  }

  return { upload, uploading, error, clearError: () => setError(null) }
}

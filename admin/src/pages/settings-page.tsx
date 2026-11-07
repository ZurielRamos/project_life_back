import { useEffect, useState } from "react"
import { Loader2 } from "lucide-react"

import { ApiError } from "@/lib/api"
import {
  getGenerationSettings,
  updateGenerationSettings,
} from "@/lib/settings-api"
import { AppHeader } from "@/components/app-header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export function SettingsPage() {
  const [maxPerHour, setMaxPerHour] = useState("")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [savedAt, setSavedAt] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    getGenerationSettings()
      .then((s) => {
        if (active) setMaxPerHour(String(s.maxColorGenerationsPerHour))
      })
      .catch((err) => {
        if (!active) return
        setError(
          err instanceof ApiError
            ? err.message
            : "No se pudieron cargar los ajustes."
        )
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  async function handleSave() {
    const value = Number(maxPerHour)
    if (Number.isNaN(value) || value < 0) {
      setError("Ingresa un número válido (0 o mayor).")
      return
    }
    setSaving(true)
    setError(null)
    setSavedAt(null)
    try {
      const updated = await updateGenerationSettings({
        maxColorGenerationsPerHour: Math.round(value),
      })
      setMaxPerHour(String(updated.maxColorGenerationsPerHour))
      setSavedAt(new Date().toLocaleTimeString())
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "No se pudieron guardar los ajustes."
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-6 p-6">
      <AppHeader
        title="Ajustes de generación"
        description="Controla los límites de la función 'Crea tu propia camiseta'."
      />

      {loading ? (
        <div className="flex flex-1 items-center justify-center">
          <Loader2 className="size-6 animate-spin text-neutral-400" />
        </div>
      ) : (
        <div className="max-w-md">
          <div className="flex flex-col gap-4 rounded-2xl border bg-white p-6">
            {error && (
              <div
                role="alert"
                className="border-destructive/50 bg-destructive/10 text-destructive rounded-md border px-3 py-2 text-sm"
              >
                {error}
              </div>
            )}

            <div className="grid gap-2">
              <Label htmlFor="max-per-hour">
                Máximo de generaciones por hora (por cliente)
              </Label>
              <Input
                id="max-per-hour"
                type="number"
                min="0"
                value={maxPerHour}
                onChange={(e) => setMaxPerHour(e.target.value)}
              />
              <p className="text-xs text-neutral-500">
                Cada generación corresponde a renderizar la sesión completa de
                un color con el diseño del cliente. Usa 0 para no limitar.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <Button type="button" onClick={handleSave} disabled={saving}>
                {saving && <Loader2 className="size-4 animate-spin" />}
                Guardar
              </Button>
              {savedAt && (
                <span className="text-xs text-neutral-500">
                  Guardado · {savedAt}
                </span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

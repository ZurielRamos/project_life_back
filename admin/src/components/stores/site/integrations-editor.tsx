import type { IntegrationsConfig } from "@/types/api"

import { Card, TextField } from "./fields"

interface Props {
  value: IntegrationsConfig
  onChange: (value: IntegrationsConfig) => void
}

/** Medición y verificación con servicios externos. */
export function IntegrationsEditor({ value, onChange }: Props) {
  const set = (patch: Partial<IntegrationsConfig>) =>
    onChange({ ...value, ...patch })

  return (
    <div className="flex flex-col gap-6">
      <Card
        title="Analítica y publicidad"
        description="Se cargan en todas las páginas de la tienda. Deja vacío lo que no uses."
      >
        <TextField
          label="Google Analytics 4 (ID de medición)"
          value={value.googleAnalyticsId}
          onChange={(googleAnalyticsId) => set({ googleAnalyticsId })}
          placeholder="G-XXXXXXXXXX"
          maxLength={30}
          hint="Lo encuentras en Analytics → Administrar → Flujos de datos."
        />
        <TextField
          label="Meta Pixel (ID del píxel)"
          value={value.metaPixelId}
          onChange={(metaPixelId) => set({ metaPixelId })}
          placeholder="123456789012345"
          maxLength={30}
          hint="Solo números. Lo encuentras en el Administrador de eventos de Meta."
        />
      </Card>

      <Card
        title="Verificación del sitio"
        description="Para demostrar a Google que eres el dueño de la tienda."
      >
        <TextField
          label="Google Search Console (código de verificación)"
          value={value.googleSiteVerification}
          onChange={(googleSiteVerification) => set({ googleSiteVerification })}
          placeholder="Código de la etiqueta meta"
          maxLength={100}
          hint="Copia solo el valor de content de la etiqueta meta google-site-verification."
        />
      </Card>

      <p className="text-xs text-neutral-500">
        Si usas analítica o publicidad, recuerda informar el uso de cookies y
        cumplir la normativa de privacidad de tu país en una página de
        políticas.
      </p>
    </div>
  )
}

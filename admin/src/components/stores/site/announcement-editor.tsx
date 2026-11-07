import type { AnnouncementConfig } from "@/types/api"

import {
  Card,
  ColorField,
  FieldRow,
  LinkField,
  SwitchField,
  TextField,
} from "./fields"

interface Props {
  value: AnnouncementConfig
  onChange: (value: AnnouncementConfig) => void
}

/** Barra fina sobre el encabezado para avisos (envío gratis, promociones…). */
export function AnnouncementEditor({ value, onChange }: Props) {
  const set = (patch: Partial<AnnouncementConfig>) =>
    onChange({ ...value, ...patch })

  return (
    <div className="flex flex-col gap-6">
      <Card
        title="Barra de anuncio"
        description="Una línea destacada en la parte superior de todo el sitio."
      >
        <SwitchField
          label="Mostrar barra de anuncio"
          description="Se ve en todas las páginas, encima del encabezado."
          checked={value.enabled}
          onChange={(enabled) => set({ enabled })}
        />
        <TextField
          label="Texto"
          value={value.text}
          onChange={(text) => set({ text })}
          maxLength={160}
          placeholder="Envío gratis en compras superiores a $100.000"
        />
        <FieldRow>
          <TextField
            label="Texto del enlace (opcional)"
            value={value.linkLabel}
            onChange={(linkLabel) => set({ linkLabel })}
            maxLength={40}
            placeholder="Ver condiciones"
          />
          <LinkField
            label="Destino del enlace"
            value={value.linkUrl}
            onChange={(linkUrl) => set({ linkUrl })}
          />
        </FieldRow>
        <FieldRow>
          <ColorField
            label="Color de fondo"
            value={value.backgroundColor}
            onChange={(backgroundColor) => set({ backgroundColor })}
          />
          <ColorField
            label="Color del texto"
            value={value.textColor}
            onChange={(textColor) => set({ textColor })}
          />
        </FieldRow>
      </Card>

      <Card title="Vista previa">
        <div
          className="flex min-h-9 items-center justify-center gap-2 rounded-lg px-4 py-2 text-center text-sm"
          style={{
            backgroundColor: value.backgroundColor,
            color: value.textColor,
          }}
        >
          <span>{value.text || "El texto del anuncio aparecerá aquí"}</span>
          {value.linkLabel && (
            <span className="font-semibold underline underline-offset-2">
              {value.linkLabel}
            </span>
          )}
        </div>
        {!value.enabled && (
          <p className="text-xs text-neutral-500">
            La barra está desactivada: no se muestra en el sitio.
          </p>
        )}
      </Card>
    </div>
  )
}

import type { HeaderConfig } from "@/types/api"

import { Card, FieldRow, LinkField, RepeatableList, TextField } from "./fields"

interface Props {
  value: HeaderConfig
  onChange: (value: HeaderConfig) => void
}

/** Menú de navegación del encabezado. */
export function HeaderEditor({ value, onChange }: Props) {
  return (
    <Card
      title="Menú de navegación"
      description="Enlaces que aparecen a la izquierda del logo. En móvil el encabezado muestra solo el logo."
    >
      <RepeatableList
        items={value.navItems}
        onChange={(navItems) => onChange({ ...value, navItems })}
        createItem={() => ({ label: "", url: "/tienda" })}
        max={8}
        itemLabel="enlace"
        addLabel="Agregar enlace"
        emptyLabel="Sin enlaces: el encabezado mostrará solo el logo."
        renderItem={(item, update) => (
          <FieldRow>
            <TextField
              label="Texto"
              value={item.label}
              onChange={(label) => update({ label })}
              maxLength={60}
              placeholder="MUJER"
            />
            <LinkField
              label="Destino"
              value={item.url}
              onChange={(url) => update({ url })}
            />
          </FieldRow>
        )}
      />
    </Card>
  )
}

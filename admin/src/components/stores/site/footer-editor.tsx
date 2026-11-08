import type { FooterColumn, FooterConfig } from "@/types/api"

import {
  Card,
  LinkList,
  RepeatableList,
  SwitchField,
  TextAreaField,
  TextField,
} from "./fields"

interface Props {
  value: FooterConfig
  onChange: (value: FooterConfig) => void
}

/** Pie de página: descripción, columnas de enlaces, enlaces legales. */
export function FooterEditor({ value, onChange }: Props) {
  const set = (patch: Partial<FooterConfig>) => onChange({ ...value, ...patch })

  return (
    <div className="flex flex-col gap-6">
      <Card
        title="Contenido"
        description="Texto bajo el logo y datos que se muestran en el pie."
      >
        <TextAreaField
          label="Texto descriptivo"
          value={value.about}
          onChange={(about) => set({ about })}
          maxLength={300}
          rows={3}
          hint="Si lo dejas vacío se usa el eslogan o la descripción de la tienda."
        />
        <SwitchField
          label="Mostrar redes sociales y contacto"
          description="Iconos de redes, WhatsApp y correo configurados en «Contacto y redes»."
          checked={value.showSocial}
          onChange={(showSocial) => set({ showSocial })}
        />
        <SwitchField
          label="Mostrar teléfono y dirección"
          checked={value.showContactInfo}
          onChange={(showContactInfo) => set({ showContactInfo })}
        />
      </Card>

      <Card
        title="Columnas de enlaces"
        description="Hasta 4 columnas con 10 enlaces cada una."
      >
        <RepeatableList<FooterColumn>
          items={value.columns}
          onChange={(columns) => set({ columns })}
          createItem={() => ({ title: "", links: [] })}
          max={4}
          itemLabel="columna"
          itemTitle={(column) => column.title}
          addLabel="Agregar columna"
          emptyLabel="Sin columnas de enlaces."
          renderItem={(column, update) => (
            <div className="flex flex-col gap-3">
              <TextField
                label="Título de la columna"
                value={column.title}
                onChange={(title) => update({ title })}
                maxLength={40}
                placeholder="Ayuda"
              />
              <LinkList
                items={column.links}
                onChange={(links) => update({ links })}
                max={10}
                itemLabel="enlace"
                addLabel="Agregar enlace"
                emptyLabel="Esta columna aún no tiene enlaces."
              />
            </div>
          )}
        />
      </Card>

      <Card
        title="Parte inferior"
        description="Copyright y enlaces legales (privacidad, términos, cookies…)."
      >
        <TextField
          label="Texto de copyright"
          value={value.copyright}
          onChange={(copyright) => set({ copyright })}
          maxLength={200}
          hint="Si lo dejas vacío: «© año Nombre. Todos los derechos reservados.»"
        />
        <LinkList
          items={value.legalLinks}
          onChange={(legalLinks) => set({ legalLinks })}
          max={6}
          itemLabel="enlace legal"
          addLabel="Agregar enlace legal"
          emptyLabel="Sin enlaces legales."
          textPlaceholder="Privacidad"
        />
      </Card>
    </div>
  )
}

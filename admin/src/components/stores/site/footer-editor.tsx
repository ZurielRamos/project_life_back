import type { FooterColumn, FooterConfig } from "@/types/api"

import {
  Card,
  FieldRow,
  LinkField,
  LinkList,
  Segmented,
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
  // Valores por defecto si la configuración guardada es anterior a estas opciones.
  const v: FooterConfig = { ...FOOTER_DEFAULTS, ...value }
  const cta = v.cta ?? EMPTY_LINK

  return (
    <div className="flex flex-col gap-6">
      <Card
        title="Diseño"
        description="Cómo se ve el pie de página: la distribución, los colores y el logo."
      >
        <Segmented
          label="Distribución"
          value={v.layout}
          onChange={(layout) => set({ layout })}
          options={[
            { value: "columns", label: "Marca + columnas" },
            { value: "centered", label: "Centrado" },
            { value: "compact", label: "Compacto" },
          ]}
          hint={LAYOUT_HINTS[v.layout]}
        />
        <Segmented
          label="Colores"
          value={v.appearance}
          onChange={(appearance) => set({ appearance })}
          options={[
            { value: "dark", label: "Oscuro" },
            { value: "light", label: "Claro" },
            { value: "brand", label: "Color de marca" },
          ]}
          hint="«Color de marca» usa el color principal de la tienda como fondo, con texto blanco."
        />
        <SwitchField
          label="Mostrar logo"
          description="Si no hay logo subido se muestra el nombre de la tienda."
          checked={v.showLogo}
          onChange={(showLogo) => set({ showLogo })}
        />
        {v.showLogo && (
          <Segmented
            label="Tamaño del logo"
            value={v.logoSize}
            onChange={(logoSize) => set({ logoSize })}
            options={[
              { value: "sm", label: "Pequeño" },
              { value: "md", label: "Mediano" },
              { value: "lg", label: "Grande" },
            ]}
          />
        )}
      </Card>

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
        <div className="grid gap-2">
          <div>
            <p className="text-sm font-medium text-neutral-900">
              Botón destacado
            </p>
            <p className="text-xs text-neutral-500">
              Opcional. Aparece bajo el texto descriptivo, por ejemplo
              «Escríbenos por WhatsApp» o «Ver catálogo». Se muestra solo si
              tiene texto y destino.
            </p>
          </div>
          <FieldRow>
            <TextField
              label="Texto del botón"
              value={cta.label}
              onChange={(label) => set({ cta: { ...cta, label } })}
              maxLength={60}
              placeholder="Escríbenos"
            />
            <LinkField
              label="Destino del botón"
              value={cta.url}
              onChange={(url) => set({ cta: { ...cta, url } })}
            />
          </FieldRow>
        </div>
      </Card>

      <Card
        title="Columnas de enlaces"
        description="Hasta 4 columnas con 10 enlaces cada una."
      >
        <Segmented
          label="Columnas en celular"
          value={v.mobileColumns}
          onChange={(mobileColumns) => set({ mobileColumns })}
          options={[
            { value: "hidden", label: "Ocultas" },
            { value: "accordion", label: "Desplegables" },
            { value: "visible", label: "Visibles" },
          ]}
          hint={MOBILE_HINTS[v.mobileColumns]}
        />
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
        <TextField
          label="Nota corta"
          value={v.bottomNote}
          onChange={(bottomNote) => set({ bottomNote })}
          maxLength={120}
          placeholder="Envíos a todo el país"
          hint="Opcional. Una línea junto al copyright, por ejemplo envíos, horarios o medios de pago."
        />
        <SwitchField
          label="Mostrar «Volver arriba»"
          description="Enlace al final del pie que lleva al inicio de la página. Útil en páginas largas como el catálogo."
          checked={v.showBackToTop}
          onChange={(showBackToTop) => set({ showBackToTop })}
        />
        <p className="rounded-lg bg-neutral-100 px-3 py-2 text-xs text-neutral-600">
          Las páginas legales (términos, privacidad, devoluciones…) se crean y
          editan en <strong>Sitio web → Páginas</strong>. Las que tengan activo
          «Enlazar en el pie de página» aparecen aquí solas al publicarlas. Abajo
          solo agregas enlaces extra, por ejemplo a un sitio externo.
        </p>
        <LinkList
          items={value.legalLinks}
          onChange={(legalLinks) => set({ legalLinks })}
          max={6}
          itemLabel="enlace legal"
          addLabel="Agregar enlace legal"
          emptyLabel="Sin enlaces extra."
          textPlaceholder="Privacidad"
        />
      </Card>
    </div>
  )
}

const EMPTY_LINK = { label: "", url: "" }

const FOOTER_DEFAULTS: Partial<FooterConfig> = {
  layout: "columns",
  appearance: "dark",
  showLogo: true,
  logoSize: "md",
  mobileColumns: "hidden",
  cta: EMPTY_LINK,
  bottomNote: "",
  showBackToTop: false,
}

const LAYOUT_HINTS: Record<FooterConfig["layout"], string> = {
  columns:
    "Logo, texto y redes a la izquierda; columnas de enlaces a la derecha. La opción clásica.",
  centered:
    "Todo apilado y centrado: logo, texto, redes y debajo las columnas. Queda bien con pocos enlaces.",
  compact:
    "Una franja baja: logo y redes a un lado, enlaces en línea al otro. Oculta el texto descriptivo.",
}

const MOBILE_HINTS: Record<FooterConfig["mobileColumns"], string> = {
  hidden: "En celular solo se ven el logo, el texto y las redes; los enlaces se ocultan para que el pie sea corto.",
  accordion: "Cada columna se muestra cerrada con su título; al tocarla se despliegan sus enlaces.",
  visible: "Todas las columnas abiertas, de a dos por fila. El pie queda más largo.",
}

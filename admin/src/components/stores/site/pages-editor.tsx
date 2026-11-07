import type { SitePage } from "@/types/api"

import {
  Card,
  FieldRow,
  RepeatableList,
  SwitchField,
  TextAreaField,
  TextField,
} from "./fields"

interface Props {
  value: SitePage[]
  onChange: (value: SitePage[]) => void
}

/** Convierte un título en un identificador de URL. */
function slugify(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
}

/** Páginas de contenido (envíos, devoluciones, sobre nosotros, políticas…). */
export function PagesEditor({ value, onChange }: Props) {
  return (
    <div className="flex flex-col gap-6">
      <Card
        title="Páginas de contenido"
        description="Crea páginas informativas disponibles en /p/«dirección». Luego enlázalas desde el menú, el pie de página o el home."
      >
        <RepeatableList<SitePage>
          items={value}
          onChange={onChange}
          createItem={() => ({
            slug: "",
            title: "",
            content: "",
            published: true,
          })}
          max={10}
          itemLabel="página"
          addLabel="Agregar página"
          emptyLabel="Aún no hay páginas. Crea la primera, por ejemplo «Envíos y devoluciones»."
          renderItem={(page, update) => (
            <div className="flex flex-col gap-3">
              <FieldRow>
                <TextField
                  label="Título"
                  value={page.title}
                  onChange={(title) =>
                    // La dirección se autocompleta mientras no se edite a mano.
                    update({
                      title,
                      slug:
                        !page.slug || page.slug === slugify(page.title)
                          ? slugify(title)
                          : page.slug,
                    })
                  }
                  maxLength={100}
                  placeholder="Envíos y devoluciones"
                />
                <TextField
                  label="Dirección"
                  value={page.slug}
                  onChange={(slug) => update({ slug: slugify(slug) })}
                  maxLength={60}
                  placeholder="envios-y-devoluciones"
                  hint={page.slug ? `/p/${page.slug}` : "Solo minúsculas, números y guiones."}
                />
              </FieldRow>
              <TextAreaField
                label="Contenido"
                value={page.content}
                onChange={(content) => update({ content })}
                maxLength={10000}
                rows={10}
                hint="Formato: # Título, ## Subtítulo, **negrita**, *cursiva*, listas con «- » o «1. », enlaces [texto](url)."
              />
              <SwitchField
                label="Publicada"
                description="Si no está publicada, la dirección responde «no encontrada»."
                checked={page.published}
                onChange={(published) => update({ published })}
              />
            </div>
          )}
        />
      </Card>
    </div>
  )
}

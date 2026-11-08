import { useContext } from "react"
import { AlertTriangle, Check, Plus } from "lucide-react"

import type { SitePage } from "@/types/api"

import {
  Card,
  FieldRow,
  RepeatableList,
  SwitchField,
  TextAreaField,
  TextField,
} from "./fields"
import { LEGAL_TEMPLATES, type LegalStoreData } from "./legal-templates"
import { SiteEditorContext } from "./site-context"

/** Máximo de páginas (igual que en la API). */
const MAX_PAGES = 20

interface Props {
  value: SitePage[]
  onChange: (value: SitePage[]) => void
  /** Datos de la tienda para rellenar las plantillas legales. */
  store: LegalStoreData
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
export function PagesEditor({ value, onChange, store }: Props) {
  const { readOnly } = useContext(SiteEditorContext)
  const existing = new Set(value.map((p) => p.slug))
  const missing = LEGAL_TEMPLATES.filter((t) => !existing.has(t.slug))

  // Las plantillas se crean sin publicar: primero hay que completar los
  // [CAMPOS] y revisarlas.
  const addTemplates = (slugs: string[]) => {
    const toAdd = LEGAL_TEMPLATES.filter(
      (t) => slugs.includes(t.slug) && !existing.has(t.slug)
    )
      .slice(0, MAX_PAGES - value.length)
      .map<SitePage>((t) => ({
        slug: t.slug,
        title: t.title,
        content: t.content(store),
        published: false,
        inFooter: true,
      }))
    if (toAdd.length) onChange([...value, ...toAdd])
  }

  return (
    <div className="flex flex-col gap-6">
      <Card
        title="Páginas legales recomendadas"
        description="Para vender en línea en Colombia la tienda debe informar quién vende, cómo se tratan los datos, el derecho de retracto, las garantías y un canal de reclamos. Crea cada página con una plantilla y complétala."
      >
        <div
          role="note"
          className="flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900"
        >
          <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <p>
            Son plantillas orientativas basadas en la Ley 1480 de 2011 (Estatuto
            del Consumidor) y la Ley 1581 de 2012 (datos personales). Se crean{" "}
            <strong>sin publicar</strong>: completa lo que está entre
            [CORCHETES], ajústalas a cómo opera tu tienda y, idealmente, revísalas
            con un abogado antes de publicarlas. Los datos de contacto se toman de
            «Contacto y redes».
          </p>
        </div>

        <ul className="grid gap-2 sm:grid-cols-2">
          {LEGAL_TEMPLATES.map((t) => {
            const created = existing.has(t.slug)
            const full = value.length >= MAX_PAGES
            return (
              <li
                key={t.slug}
                className="flex items-start justify-between gap-3 rounded-xl border border-neutral-200 p-3"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-neutral-900">
                    {t.title}
                  </p>
                  <p className="text-xs text-neutral-500">{t.description}</p>
                </div>
                {created ? (
                  <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700">
                    <Check className="size-3.5" aria-hidden="true" />
                    Creada
                  </span>
                ) : (
                  <button
                    type="button"
                    disabled={readOnly || full}
                    onClick={() => addTemplates([t.slug])}
                    aria-label={`Crear página: ${t.title}`}
                    className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-neutral-300 px-2.5 py-1.5 text-xs font-medium text-neutral-900 hover:bg-neutral-100 disabled:opacity-50"
                  >
                    <Plus className="size-3.5" aria-hidden="true" />
                    Crear
                  </button>
                )}
              </li>
            )
          })}
        </ul>

        {missing.length > 1 && (
          <button
            type="button"
            disabled={readOnly || value.length >= MAX_PAGES}
            onClick={() => addTemplates(missing.map((t) => t.slug))}
            className="inline-flex w-fit items-center gap-1.5 rounded-lg bg-neutral-900 px-3 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
          >
            <Plus className="size-4" aria-hidden="true" />
            Crear las {missing.length} que faltan
          </button>
        )}
        <p className="text-xs text-neutral-500">
          Recuerda guardar después de crearlas. Al publicarlas aparecen solas en
          la franja inferior del pie de página.
        </p>
      </Card>

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
            inFooter: false,
          })}
          max={MAX_PAGES}
          itemLabel="página"
          itemTitle={(page) =>
            page.published ? page.title : `${page.title} (sin publicar)`
          }
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
              {/* [texto](url) es un enlace; cualquier otro [..] es un campo pendiente. */}
              {/\[[^\]\n]+\](?!\()/.test(page.content) && (
                <p
                  role="status"
                  className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900"
                >
                  Esta página aún tiene campos por completar entre [CORCHETES].
                </p>
              )}
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
              <SwitchField
                label="Enlazar en el pie de página"
                description="Aparece sola en la franja inferior del pie, junto al copyright. Ideal para las páginas legales."
                checked={page.inFooter ?? false}
                onChange={(inFooter) => update({ inFooter })}
              />
            </div>
          )}
        />
      </Card>
    </div>
  )
}

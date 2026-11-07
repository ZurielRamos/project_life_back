import { useMemo, useState } from "react"
import { ExternalLink, Loader2 } from "lucide-react"

import { ApiError } from "@/lib/api"
import { updateStore } from "@/lib/stores-api"
import type { SiteConfig, Store } from "@/types/api"
import { Button } from "@/components/ui/button"

import { AnnouncementEditor } from "./announcement-editor"
import { ContactEditor } from "./contact-editor"
import { FooterEditor } from "./footer-editor"
import { HeaderEditor } from "./header-editor"
import { HomeEditor } from "./home-editor"
import { IntegrationsEditor } from "./integrations-editor"
import { PagesEditor } from "./pages-editor"
import { SiteEditorContext } from "./site-context"
import { SITE_SECTIONS } from "./site-sections"

/** Validación previa al guardado; devuelve el motivo si no se puede guardar. */
function validate(key: keyof SiteConfig, draft: SiteConfig): string | null {
  const missingUrl = (links: { label: string; url: string }[]) =>
    links.some((l) => l.label.trim() && !l.url.trim())

  switch (key) {
    case "header":
      if (draft.header.navItems.some((i) => !i.label.trim())) {
        return "Todos los enlaces del menú necesitan un texto."
      }
      if (missingUrl(draft.header.navItems)) {
        return "Todos los enlaces del menú necesitan un destino."
      }
      return null
    case "footer": {
      if (draft.footer.columns.some((c) => !c.title.trim())) {
        return "Todas las columnas necesitan un título."
      }
      const links = [
        ...draft.footer.columns.flatMap((c) => c.links),
        ...draft.footer.legalLinks,
      ]
      if (links.some((l) => !l.label.trim())) {
        return "Todos los enlaces del pie necesitan un texto."
      }
      if (missingUrl(links)) {
        return "Todos los enlaces del pie necesitan un destino."
      }
      return null
    }
    case "pages": {
      const pages = draft.pages
      if (pages.some((p) => !p.title.trim() || !p.slug.trim())) {
        return "Cada página necesita un título y una dirección."
      }
      const slugs = pages.map((p) => p.slug)
      if (new Set(slugs).size !== slugs.length) {
        return "Hay dos páginas con la misma dirección."
      }
      return null
    }
    case "announcement":
      if (draft.announcement.enabled && !draft.announcement.text.trim()) {
        return "Escribe el texto del anuncio o desactiva la barra."
      }
      return null
    default:
      return null
  }
}

interface SiteEditorProps {
  store: Store
  /** Sección activa del menú; si no es del sitio web no se pinta nada. */
  section: string
  canUpdate: boolean
  /** Se llama con la tienda actualizada tras guardar. */
  onSaved: (store: Store) => void
}

/**
 * Editor del sitio web de la tienda. Mantiene un borrador de TODA la
 * configuración (para no perder cambios al cambiar de subsección) y guarda
 * solo la subsección activa.
 */
export function SiteEditor({
  store,
  section,
  canUpdate,
  onSaved,
}: SiteEditorProps) {
  const [draft, setDraft] = useState<SiteConfig>(store.siteConfig)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [savedAt, setSavedAt] = useState<{ id: string; time: string } | null>(
    null
  )

  const meta = SITE_SECTIONS.find((s) => s.id === section)

  const context = useMemo(
    () => ({
      storeId: store.id,
      pageSlugs: draft.pages
        .filter((p) => p.slug && p.title)
        .map((p) => ({ slug: p.slug, title: p.title })),
      readOnly: !canUpdate,
    }),
    [store.id, draft.pages, canUpdate]
  )

  if (!meta) return null
  const key = meta.key

  const dirty =
    JSON.stringify(draft[key]) !== JSON.stringify(store.siteConfig[key])
  const problem = validate(key, draft)

  function setKey<K extends keyof SiteConfig>(k: K, value: SiteConfig[K]) {
    setDraft((prev) => ({ ...prev, [k]: value }))
  }

  async function handleSave() {
    if (!meta || problem) return
    setSaving(true)
    setError(null)
    setSavedAt(null)
    try {
      const updated = await updateStore(store.id, {
        siteConfig: { [meta.key]: draft[meta.key] },
      })
      // La API devuelve la sección normalizada: se refleja en el borrador.
      setDraft((prev) => ({
        ...prev,
        [meta.key]: updated.siteConfig[meta.key],
      }))
      onSaved(updated)
      setSavedAt({ id: meta.id, time: new Date().toLocaleTimeString() })
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "No se pudo guardar esta sección."
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <SiteEditorContext.Provider value={context}>
      <div className="flex flex-col gap-4">
        <div>
          <h2 className="text-lg font-semibold text-neutral-900">
            {meta.label}
          </h2>
          <p className="text-sm text-neutral-500">{meta.description}</p>
        </div>

        {error && (
          <div
            role="alert"
            className="border-destructive/50 bg-destructive/10 text-destructive rounded-md border px-4 py-3 text-sm"
          >
            {error}
          </div>
        )}

        <fieldset disabled={!canUpdate} className="min-w-0">
          {section === "announcement" && (
            <AnnouncementEditor
              value={draft.announcement}
              onChange={(v) => setKey("announcement", v)}
            />
          )}
          {section === "header" && (
            <HeaderEditor
              value={draft.header}
              onChange={(v) => setKey("header", v)}
            />
          )}
          {section === "footer" && (
            <FooterEditor
              value={draft.footer}
              onChange={(v) => setKey("footer", v)}
            />
          )}
          {section === "home" && (
            <HomeEditor
              value={draft.home}
              onChange={(v) => setKey("home", v)}
            />
          )}
          {section === "contactPage" && (
            <ContactEditor
              value={draft.contact}
              onChange={(v) => setKey("contact", v)}
            />
          )}
          {section === "pages" && (
            <PagesEditor
              value={draft.pages}
              onChange={(v) => setKey("pages", v)}
            />
          )}
          {section === "integrations" && (
            <IntegrationsEditor
              value={draft.integrations}
              onChange={(v) => setKey("integrations", v)}
            />
          )}
        </fieldset>

        {canUpdate && (
          <div className="flex flex-wrap items-center gap-3">
            <Button
              onClick={handleSave}
              disabled={saving || !dirty || Boolean(problem)}
            >
              {saving && <Loader2 className="size-4 animate-spin" />}
              Guardar sección
            </Button>
            {problem && dirty && (
              <span role="alert" className="text-destructive text-xs">
                {problem}
              </span>
            )}
            {!problem && dirty && !saving && (
              <span className="text-xs text-neutral-500">
                Cambios sin guardar
              </span>
            )}
            {savedAt?.id === section && !dirty && (
              <span className="text-xs text-neutral-500">
                Guardado · {savedAt.time}
              </span>
            )}
            {store.publicUrl && (
              <a
                href={store.publicUrl}
                target="_blank"
                rel="noreferrer"
                className="ml-auto inline-flex items-center gap-1.5 text-sm font-medium text-neutral-600 hover:text-neutral-900"
              >
                Ver tienda
                <ExternalLink className="size-3.5" />
              </a>
            )}
          </div>
        )}
      </div>
    </SiteEditorContext.Provider>
  )
}

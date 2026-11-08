import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"
import { Link, useNavigate, useParams } from "react-router-dom"
import {
  ArrowLeft,
  Bell,
  Copy,
  ExternalLink,
  Globe,
  Loader2,
  Package,
  Palette,
  Search,
  Settings2,
  Shapes,
  Share2,
  Trash2,
  type LucideIcon,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { ApiError } from "@/lib/api"
import { listDesigns } from "@/lib/designs-api"
import { listProducts } from "@/lib/products-api"
import {
  deleteStore,
  getStore,
  getStoresConfig,
  updateStore,
} from "@/lib/stores-api"
import { useAuth } from "@/hooks/use-auth"
import { useSubdomainAvailability } from "@/hooks/use-subdomain-availability"
import type {
  DesignSummary,
  ProductSummary,
  Store,
  StoreSocialLinks,
  UpdateStorePayload,
} from "@/types/api"
import { AppHeader } from "@/components/app-header"
import { SubdomainStatus } from "@/components/stores/subdomain-status"
import { ImageUpload } from "@/components/stores/image-upload"
import { StorePreview } from "@/components/stores/store-preview"
import {
  FAVICON_RULES,
  LOGO_RULES,
} from "@/components/stores/use-image-upload"
import { CustomDomains } from "@/components/stores/custom-domains"
import { NotificationsEditor } from "@/components/stores/notifications-editor"
import { SiteEditor } from "@/components/stores/site/site-editor"
import {
  SITE_SECTIONS,
  type SiteSectionId,
} from "@/components/stores/site/site-sections"
import {
  CatalogPicker,
  type CatalogItem,
} from "@/components/stores/catalog-picker"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ColorPicker } from "@/components/ui/color-picker"
import { Combobox } from "@/components/ui/combobox"
import {
  CURRENCY_OPTIONS,
  LANGUAGE_OPTIONS,
  withCurrentOption,
} from "@/data/store-regional"

/** Estado editable del formulario (todo como string para inputs controlados). */
interface FormState {
  name: string
  slug: string
  isActive: boolean
  title: string
  tagline: string
  description: string
  logoUrl: string
  faviconUrl: string
  primaryColor: string
  secondaryColor: string
  contactEmail: string
  phone: string
  address: string
  currency: string
  locale: string
  seoTitle: string
  seoDescription: string
  socialLinks: Record<keyof StoreSocialLinks, string>
  productIds: string[]
  designIds: string[]
}

const SOCIAL_FIELDS: { key: keyof StoreSocialLinks; label: string; placeholder: string }[] = [
  { key: "instagram", label: "Instagram", placeholder: "https://instagram.com/mitienda" },
  { key: "facebook", label: "Facebook", placeholder: "https://facebook.com/mitienda" },
  { key: "tiktok", label: "TikTok", placeholder: "https://tiktok.com/@mitienda" },
  { key: "x", label: "X (Twitter)", placeholder: "https://x.com/mitienda" },
  { key: "youtube", label: "YouTube", placeholder: "https://youtube.com/@mitienda" },
  { key: "pinterest", label: "Pinterest", placeholder: "https://pinterest.com/mitienda" },
  { key: "whatsapp", label: "WhatsApp", placeholder: "+57 300 000 0000" },
]

function toForm(store: Store): FormState {
  return {
    name: store.name,
    slug: store.slug,
    isActive: store.isActive,
    title: store.title ?? "",
    tagline: store.tagline ?? "",
    description: store.description ?? "",
    logoUrl: store.logoUrl ?? "",
    faviconUrl: store.faviconUrl ?? "",
    primaryColor: store.primaryColor ?? "",
    secondaryColor: store.secondaryColor ?? "",
    contactEmail: store.contactEmail ?? "",
    phone: store.phone ?? "",
    address: store.address ?? "",
    currency: store.currency,
    locale: store.locale,
    seoTitle: store.seoTitle ?? "",
    seoDescription: store.seoDescription ?? "",
    socialLinks: {
      instagram: store.socialLinks.instagram ?? "",
      facebook: store.socialLinks.facebook ?? "",
      tiktok: store.socialLinks.tiktok ?? "",
      x: store.socialLinks.x ?? "",
      youtube: store.socialLinks.youtube ?? "",
      pinterest: store.socialLinks.pinterest ?? "",
      whatsapp: store.socialLinks.whatsapp ?? "",
    },
    productIds: store.productIds,
    designIds: store.designIds,
  }
}

type SectionId =
  | "general"
  | "brand"
  | "contact"
  | "domain"
  | "seo"
  | "products"
  | "designs"

const SECTIONS: { id: SectionId; label: string; icon: LucideIcon }[] = [
  { id: "general", label: "General", icon: Settings2 },
  { id: "brand", label: "Marca e información", icon: Palette },
  { id: "contact", label: "Contacto y redes", icon: Share2 },
  { id: "domain", label: "Dominio", icon: Globe },
  { id: "seo", label: "SEO", icon: Search },
  { id: "products", label: "Productos", icon: Package },
  { id: "designs", label: "Diseños", icon: Shapes },
]

/** Campos del formulario que guarda cada sección (guardado independiente). */
const SECTION_FIELDS: Record<SectionId, (keyof FormState)[]> = {
  general: ["name", "isActive"],
  brand: [
    "title",
    "tagline",
    "description",
    "logoUrl",
    "faviconUrl",
    "primaryColor",
    "secondaryColor",
    "currency",
    "locale",
  ],
  contact: ["contactEmail", "phone", "address", "socialLinks"],
  domain: ["slug"],
  seo: ["seoTitle", "seoDescription"],
  products: ["productIds"],
  designs: ["designIds"],
}

/** Sección activa del menú lateral; cada <Section> solo se muestra si coincide. */
const ActiveSectionContext = createContext<SectionId>("general")

function Section({
  id,
  title,
  description,
  children,
}: {
  id: SectionId
  title: string
  description?: string
  children: ReactNode
}) {
  const active = useContext(ActiveSectionContext)
  if (active !== id) return null
  return (
    <section className="flex flex-col gap-4 rounded-2xl border bg-white p-6">
      <div>
        <h2 className="text-base font-semibold text-neutral-900">{title}</h2>
        {description && (
          <p className="text-sm text-neutral-500">{description}</p>
        )}
      </div>
      {children}
    </section>
  )
}

function Field({
  id,
  label,
  hint,
  children,
}: {
  id: string
  label: string
  hint?: string
  children: ReactNode
}) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {hint && <p className="text-xs text-neutral-500">{hint}</p>}
    </div>
  )
}

export function StoreDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const canUpdate = user?.permissions.includes("stores:update") ?? false
  const canDelete = user?.permissions.includes("stores:delete") ?? false
  // Las credenciales de notificaciones tienen su propio permiso.
  const canNotify =
    user?.permissions.includes("stores:notifications") ?? false

  const [store, setStore] = useState<Store | null>(null)
  const [form, setForm] = useState<FormState | null>(null)
  const [products, setProducts] = useState<ProductSummary[]>([])
  const [designs, setDesigns] = useState<DesignSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [savedAt, setSavedAt] = useState<string | null>(null)
  const [section, setSection] = useState<SectionId>("general")
  // Subsección activa del grupo «Sitio web» (null = se ve una sección de Tienda).
  const [siteSection, setSiteSection] = useState<SiteSectionId | null>(null)
  // Sección «Notificaciones»: se monta al abrirla y se conserva para no
  // perder el borrador al cambiar de sección.
  const [showNotifications, setShowNotifications] = useState(false)
  const [notificationsOpened, setNotificationsOpened] = useState(false)
  const [baseDomain, setBaseDomain] = useState<string | null>(null)
  // Disponibilidad del subdominio (se comprueba 1 s después de dejar de escribir).
  const subdomain = useSubdomainAvailability(
    form?.slug ?? "",
    store?.slug ?? "",
    store?.id
  )

  useEffect(() => {
    if (!id) return
    let active = true
    setLoading(true)
    Promise.all([
      getStore(id),
      getStoresConfig().catch(() => ({ baseDomain: null })),
      // El catálogo es de solo lectura aquí; si falta permiso, queda vacío.
      listProducts().catch(() => [] as ProductSummary[]),
      listDesigns().catch(() => [] as DesignSummary[]),
    ])
      .then(([storeData, config, productsData, designsData]) => {
        if (!active) return
        setStore(storeData)
        setBaseDomain(config.baseDomain)
        setForm(toForm(storeData))
        setProducts(productsData)
        setDesigns(designsData)
      })
      .catch((err) => {
        if (!active) return
        setError(
          err instanceof ApiError
            ? err.message
            : "No se pudo cargar la tienda."
        )
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [id])

  const productItems = useMemo<CatalogItem[]>(
    () =>
      products.map((p) => ({
        id: p.id,
        name: p.name,
        subtitle: `${p.colorCount} colores · ${p.sizeCount} tallas`,
        imageUrl: p.coverThumbnailUrl,
      })),
    [products]
  )

  // Solo se ofrecen los diseños de los productos elegidos en la sección
  // Productos (los demás no se podrían vender en esta tienda).
  const selectedProductIds = form?.productIds
  const designItems = useMemo<CatalogItem[]>(() => {
    const allowed = new Set(selectedProductIds ?? [])
    return designs
      .filter((d) => allowed.has(d.productId))
      .map((d) => ({
        id: d.id,
        name: d.name,
        subtitle: d.productName,
        imageUrl: d.coverImageUrl,
        // Solo se pueden publicar diseños terminados.
        disabled: d.status !== "ready",
      }))
  }, [designs, selectedProductIds])

  /**
   * Cambia los productos publicados y quita de la selección los diseños de
   * los productos que ya no están elegidos.
   */
  function handleProductsChange(ids: string[]) {
    setForm((prev) => {
      if (!prev) return prev
      const next = { ...prev, productIds: ids }
      // Sin el listado de diseños (p. ej. sin permiso) no se puede deducir
      // a qué producto pertenece cada uno: se deja la selección como está.
      if (designs.length > 0) {
        const allowed = new Set(ids)
        const valid = new Set(
          designs.filter((d) => allowed.has(d.productId)).map((d) => d.id)
        )
        next.designIds = prev.designIds.filter((id) => valid.has(id))
      }
      return next
    })
  }

  function patch<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev))
  }

  function patchSocial(key: keyof StoreSocialLinks, value: string) {
    setForm((prev) =>
      prev
        ? { ...prev, socialLinks: { ...prev.socialLinks, [key]: value } }
        : prev
    )
  }

  /** Guarda solo los campos de la sección activa. */
  async function handleSave() {
    if (!store || !form) return
    const keys = SECTION_FIELDS[section]
    const payload: Record<string, unknown> = {}
    for (const key of keys) {
      const value = form[key]
      payload[key] = typeof value === "string" ? value.trim() : value
    }
    // Moneda e idioma tienen valor por defecto: vacíos no se envían.
    if (!payload.currency) delete payload.currency
    if (!payload.locale) delete payload.locale

    setSaving(true)
    setError(null)
    setSavedAt(null)
    try {
      const updated = await updateStore(
        store.id,
        payload as UpdateStorePayload
      )
      setStore(updated)
      // Solo se refrescan los campos guardados; las ediciones pendientes de
      // otras secciones se conservan.
      const fresh = toForm(updated)
      setForm((prev) => {
        if (!prev) return prev
        const next: Record<string, unknown> = { ...prev }
        for (const key of keys) next[key] = fresh[key]
        return next as unknown as FormState
      })
      setSavedAt(new Date().toLocaleTimeString())
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "No se pudo guardar la tienda."
      )
    } finally {
      setSaving(false)
    }
  }

  function changeSection(next: SectionId) {
    setSection(next)
    setSiteSection(null)
    setShowNotifications(false)
    setError(null)
    setSavedAt(null)
  }

  function openNotifications() {
    setSiteSection(null)
    setShowNotifications(true)
    setNotificationsOpened(true)
    setError(null)
    setSavedAt(null)
  }

  function changeSiteSection(next: SiteSectionId) {
    setSiteSection(next)
    setShowNotifications(false)
    setError(null)
    setSavedAt(null)
  }

  async function handleDelete() {
    if (!store) return
    if (
      !window.confirm(
        `¿Eliminar la tienda "${store.name}"? Los productos y diseños del catálogo principal no se verán afectados.`
      )
    ) {
      return
    }
    try {
      await deleteStore(store.id)
      navigate("/stores", { replace: true })
    } catch (err) {
      window.alert(
        err instanceof ApiError
          ? err.message
          : "No se pudo eliminar la tienda."
      )
    }
  }

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Loader2 className="size-6 animate-spin text-neutral-400" />
      </div>
    )
  }

  if (!store || !form) {
    return (
      <div className="flex flex-col gap-4 p-6">
        <div
          role="alert"
          className="border-destructive/50 bg-destructive/10 text-destructive rounded-md border px-4 py-3 text-sm"
        >
          {error ?? "Tienda no encontrada."}
        </div>
        <Link to="/stores" className="text-sm underline">
          Volver a tiendas
        </Link>
      </div>
    )
  }

  const readOnly = !canUpdate

  /** Recarga solo los datos de la tienda (p. ej. URL pública tras cambiar el favorito). */
  async function refreshStore() {
    try {
      setStore(await getStore(store!.id))
    } catch {
      // Si falla, se mantiene lo que ya se muestra.
    }
  }
  const savedSubdomain = store.slug === form.slug
  // En Dominio no se guarda mientras el subdominio no esté confirmado libre.
  const blocked =
    section === "domain" &&
    ["pending", "checking", "unavailable"].includes(subdomain.status)
  const baseline = toForm(store)
  const dirty = SECTION_FIELDS[section].some(
    (key) => JSON.stringify(form[key]) !== JSON.stringify(baseline[key])
  )

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-6 p-6">
      <AppHeader
        title={store.name}
        description={
          store.publicUrl?.replace("https://", "") ??
          undefined
        }
        leading={
          <Link
            to="/stores"
            aria-label="Volver a tiendas"
            className="flex size-10 items-center justify-center rounded-full border bg-white text-neutral-600 hover:text-neutral-900"
          >
            <ArrowLeft className="size-4" />
          </Link>
        }
        actions={
          <>
            {store.publicUrl && (
              <Button asChild variant="outline">
                <a href={store.publicUrl} target="_blank" rel="noreferrer">
                  <ExternalLink className="size-4" />
                  Ir
                </a>
              </Button>
            )}
            {canDelete && (
              <Button
                variant="outline"
                className="text-destructive hover:text-destructive"
                onClick={handleDelete}
              >
                <Trash2 className="size-4" />
                Eliminar
              </Button>
            )}
          </>
        }
      />

      <div className="flex min-h-0 flex-1 gap-6">
        {/* Menú lateral de secciones */}
        <nav
          aria-label="Secciones de la tienda"
          className="flex w-52 shrink-0 flex-col gap-1 overflow-y-auto"
        >
          <p className="px-3 pt-1 pb-1 text-[11px] font-semibold tracking-wide text-neutral-400 uppercase">
            Tienda
          </p>
          {SECTIONS.map(({ id: sectionId, label, icon: Icon }) => {
            const active = !siteSection && !showNotifications && section === sectionId
            return (
              <button
                key={sectionId}
                type="button"
                onClick={() => changeSection(sectionId)}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-2.5 rounded-xl px-3 py-2 text-left text-sm font-medium transition-colors",
                  active
                    ? "bg-neutral-900 text-white"
                    : "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900"
                )}
              >
                <Icon className="size-4 shrink-0" />
                {label}
              </button>
            )
          })}

          {canNotify && (
            <button
              type="button"
              onClick={openNotifications}
              aria-current={showNotifications ? "page" : undefined}
              className={cn(
                "flex items-center gap-2.5 rounded-xl px-3 py-2 text-left text-sm font-medium transition-colors",
                showNotifications
                  ? "bg-neutral-900 text-white"
                  : "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900"
              )}
            >
              <Bell className="size-4 shrink-0" />
              Notificaciones
            </button>
          )}

          <p className="px-3 pt-4 pb-1 text-[11px] font-semibold tracking-wide text-neutral-400 uppercase">
            Sitio web
          </p>
          {SITE_SECTIONS.map(({ id: sectionId, label, icon: Icon }) => {
            const active = siteSection === sectionId
            return (
              <button
                key={sectionId}
                type="button"
                onClick={() => changeSiteSection(sectionId)}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-2.5 rounded-xl px-3 py-2 text-left text-sm font-medium transition-colors",
                  active
                    ? "bg-neutral-900 text-white"
                    : "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900"
                )}
              >
                <Icon className="size-4 shrink-0" />
                {label}
              </button>
            )
          })}
        </nav>
  
        {/* Contenido de la sección activa */}
        <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-4 overflow-y-auto">
          {error && (
            <div
              role="alert"
              className="border-destructive/50 bg-destructive/10 text-destructive rounded-md border px-4 py-3 text-sm"
            >
              {error}
            </div>
          )}
    
          {/* Editor del sitio web: se mantiene montado para conservar el borrador. */}
          <SiteEditor
            store={store}
            section={siteSection ?? ""}
            canUpdate={canUpdate}
            onSaved={setStore}
          />

          {canNotify && notificationsOpened && (
            <NotificationsEditor
              storeId={store.id}
              active={showNotifications}
            />
          )}

          <ActiveSectionContext.Provider
            value={siteSection || showNotifications ? ("" as SectionId) : section}
          >
            <fieldset disabled={readOnly} className="flex flex-col gap-6">
              <Section
                id="general"
                title="General"
                description="Identificación interna y estado de la tienda."
              >
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field id="store-name" label="Nombre interno">
                    <Input
                      id="store-name"
                      value={form.name}
                      onChange={(e) => patch("name", e.target.value)}
                      minLength={2}
                      maxLength={80}
                      required
                    />
                  </Field>
                </div>
                <label className="flex items-center gap-2 text-sm text-neutral-700">
                  <input
                    type="checkbox"
                    checked={form.isActive}
                    onChange={(e) => patch("isActive", e.target.checked)}
                    className="size-4"
                  />
                  Tienda activa
                </label>
              </Section>
      
              <Section
                id="brand"
                title="Marca e información"
                description="Textos y recursos visuales que muestra la tienda. La vista previa se actualiza mientras editas."
              >
                <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
                  <StorePreview
                    className="order-first w-full max-w-md xl:sticky xl:top-0 xl:order-last xl:max-w-none xl:self-start"
                    name={form.name}
                    title={form.title}
                    seoTitle={form.seoTitle}
                    tagline={form.tagline}
                    logoUrl={form.logoUrl}
                    faviconUrl={form.faviconUrl}
                    primaryColor={form.primaryColor}
                    secondaryColor={form.secondaryColor}
                    host={
                      baseDomain && form.slug
                        ? `${form.slug}.${baseDomain}`
                        : (store.publicUrl?.replace("https://", "") ??
                          "tu-tienda.com")
                    }
                  />

                  <div className="flex min-w-0 flex-col gap-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Field id="store-title" label="Título">
                        <Input
                          id="store-title"
                          value={form.title}
                          onChange={(e) => patch("title", e.target.value)}
                          maxLength={120}
                        />
                      </Field>
                      <Field id="store-tagline" label="Eslogan">
                        <Input
                          id="store-tagline"
                          value={form.tagline}
                          onChange={(e) => patch("tagline", e.target.value)}
                          maxLength={200}
                        />
                      </Field>
                    </div>
                    <Field id="store-description" label="Descripción">
                      <textarea
                        id="store-description"
                        value={form.description}
                        onChange={(e) => patch("description", e.target.value)}
                        maxLength={2000}
                        rows={4}
                        className="border-input focus-visible:border-ring focus-visible:ring-ring/50 w-full rounded-md border bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:ring-[3px] disabled:opacity-50"
                      />
                    </Field>

                    <div className="grid gap-4 2xl:grid-cols-2">
                      <ImageUpload
                        storeId={store.id}
                        label="Logo"
                        value={form.logoUrl}
                        onChange={(url) => patch("logoUrl", url)}
                        rules={LOGO_RULES}
                        readOnly={readOnly}
                        hint="Mejor con fondo transparente. Se usa en el encabezado, el pie y al compartir."
                      />
                      <ImageUpload
                        storeId={store.id}
                        label="Favicon"
                        value={form.faviconUrl}
                        onChange={(url) => patch("faviconUrl", url)}
                        rules={FAVICON_RULES}
                        readOnly={readOnly}
                        previewSizes={[32, 16]}
                        hint="Icono cuadrado de la pestaña del navegador, de al menos 32×32 px."
                      />
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <Field
                        id="store-color"
                        label="Color de marca"
                        hint="Botones, enlaces y detalles de todo el sitio."
                      >
                        <ColorPicker
                          id="store-color"
                          label="Color de marca"
                          value={form.primaryColor}
                          onChange={(color) => patch("primaryColor", color)}
                          disabled={readOnly}
                          allowEmpty
                          placeholder="Elegir color de marca"
                          contrastWith="#ffffff"
                          contrastLabel="el texto blanco de los botones"
                        />
                      </Field>
                      <Field
                        id="store-color-secondary"
                        label="Segundo color de marca"
                        hint="Se combina con el principal en los degradados de los botones."
                      >
                        <ColorPicker
                          id="store-color-secondary"
                          label="Segundo color de marca"
                          value={form.secondaryColor}
                          onChange={(color) => patch("secondaryColor", color)}
                          disabled={readOnly}
                          allowEmpty
                          placeholder="Elegir segundo color"
                          contrastWith="#ffffff"
                          contrastLabel="el texto blanco de los botones"
                        />
                      </Field>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <Field
                        id="store-currency"
                        label="Moneda"
                        hint="Moneda principal de la tienda."
                      >
                        <Combobox
                          id="store-currency"
                          options={withCurrentOption(
                            CURRENCY_OPTIONS,
                            form.currency
                          )}
                          value={form.currency}
                          onChange={(currency) => patch("currency", currency)}
                          placeholder="Buscar moneda…"
                          emptyText="No hay monedas que coincidan."
                          disabled={readOnly}
                        />
                      </Field>
                      <Field
                        id="store-locale"
                        label="Idioma"
                        hint="Define el idioma del sitio y el formato de números y fechas."
                      >
                        <Combobox
                          id="store-locale"
                          options={withCurrentOption(
                            LANGUAGE_OPTIONS,
                            form.locale
                          )}
                          value={form.locale}
                          onChange={(locale) => patch("locale", locale)}
                          placeholder="Buscar idioma…"
                          emptyText="No hay idiomas que coincidan."
                          disabled={readOnly}
                        />
                      </Field>
                    </div>
                  </div>
                </div>
              </Section>
      
              <Section
                id="contact"
                title="Contacto y redes sociales"
                description="Datos de contacto y enlaces que se muestran en la tienda."
              >
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field id="store-email" label="Correo de contacto">
                    <Input
                      id="store-email"
                      type="email"
                      value={form.contactEmail}
                      onChange={(e) => patch("contactEmail", e.target.value)}
                    />
                  </Field>
                  <Field id="store-phone" label="Teléfono">
                    <Input
                      id="store-phone"
                      value={form.phone}
                      onChange={(e) => patch("phone", e.target.value)}
                      maxLength={40}
                    />
                  </Field>
                </div>
                <Field id="store-address" label="Dirección">
                  <Input
                    id="store-address"
                    value={form.address}
                    onChange={(e) => patch("address", e.target.value)}
                    maxLength={500}
                  />
                </Field>
                <div className="grid gap-4 sm:grid-cols-2">
                  {SOCIAL_FIELDS.map(({ key, label, placeholder }) => (
                    <Field key={key} id={`store-social-${key}`} label={label}>
                      <Input
                        id={`store-social-${key}`}
                        value={form.socialLinks[key]}
                        onChange={(e) => patchSocial(key, e.target.value)}
                        placeholder={placeholder}
                        maxLength={255}
                      />
                    </Field>
                  ))}
                </div>
              </Section>
      
              <Section
                id="domain"
                title="Dominio"
                description="Dirección web con la que los clientes acceden a esta tienda."
              >
                <div className="grid gap-2">
                  <Label htmlFor="store-subdomain">Subdominio de la tienda</Label>
                  <div className="flex w-full max-w-sm">
                    <Input
                      id="store-subdomain"
                      value={form.slug}
                      onChange={(e) =>
                        patch(
                          "slug",
                          e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-")
                        )
                      }
                      placeholder="mi-tienda"
                      maxLength={60}
                      required
                      autoComplete="off"
                      spellCheck={false}
                      aria-invalid={subdomain.status === "unavailable"}
                      aria-describedby="store-subdomain-status"
                      className={cn("text-right", baseDomain && "rounded-r-none")}
                    />
                    {baseDomain && (
                      <span className="flex items-center rounded-r-md border border-l-0 bg-neutral-50 px-3 text-sm whitespace-nowrap text-neutral-500">
                        .{baseDomain}
                      </span>
                    )}
                  </div>
                  <div id="store-subdomain-status" className="min-h-4">
                    <SubdomainStatus state={subdomain} />
                  </div>
                </div>
              
                {baseDomain ? (
                  <div className="grid gap-2 rounded-xl bg-neutral-50 p-4">
                    <p className="text-xs text-neutral-500">
                      Tu tienda estará disponible en
                    </p>
                    <div className="flex items-center gap-2">
                      <code className="min-w-0 flex-1 truncate text-sm font-medium text-neutral-900">
                        https://{form.slug || "mi-tienda"}.{baseDomain}
                      </code>
                      {savedSubdomain && (
                        <>
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            aria-label="Copiar URL"
                            onClick={() =>
                              void navigator.clipboard.writeText(
                                `https://${store.slug}.${baseDomain}`
                              )
                            }
                          >
                            <Copy className="size-4" />
                          </Button>
                          <Button asChild variant="outline" size="icon">
                            <a
                              href={`https://${store.slug}.${baseDomain}`}
                              target="_blank"
                              rel="noreferrer"
                              aria-label="Abrir tienda"
                            >
                              <ExternalLink className="size-4" />
                            </a>
                          </Button>
                        </>
                      )}
                    </div>
                    {!savedSubdomain && (
                      <p className="text-xs text-neutral-500">
                        Guarda la sección para que este subdominio quede activo.
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-neutral-500">
                    Falta definir STORES_BASE_DOMAIN en la API para generar el subdominio.
                  </p>
                )}
              
                <CustomDomains
                  storeId={store.id}
                  canEdit={canUpdate}
                  onChanged={() => void refreshStore()}
                  platformHost={baseDomain ? `${store.slug}.${baseDomain}` : null}
                  pendingPlatformHost={
                    baseDomain && form.slug && form.slug !== store.slug
                      ? `${form.slug}.${baseDomain}`
                      : null
                  }
                />
              </Section>
      
              <Section
                id="seo"
                title="SEO"
                description="Metadatos para buscadores."
              >
                <Field
                  id="store-seo-title"
                  label="Título SEO"
                  hint="Opcional. Si lo dejas vacío, la pestaña y Google muestran «Título | Eslogan»."
                >
                  <Input
                    id="store-seo-title"
                    value={form.seoTitle}
                    onChange={(e) => patch("seoTitle", e.target.value)}
                    maxLength={120}
                  />
                </Field>
                <Field id="store-seo-description" label="Descripción SEO">
                  <textarea
                    id="store-seo-description"
                    value={form.seoDescription}
                    onChange={(e) => patch("seoDescription", e.target.value)}
                    maxLength={320}
                    rows={3}
                    className="border-input focus-visible:border-ring focus-visible:ring-ring/50 w-full rounded-md border bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:ring-[3px] disabled:opacity-50"
                  />
                </Field>
              </Section>
      
              <Section
                id="products"
                title="Productos publicados"
                description="Elige cuáles productos del catálogo principal vende esta tienda."
              >
                <CatalogPicker
                  items={productItems}
                  selectedIds={form.productIds}
                  onChange={handleProductsChange}
                  emptyMessage="No hay productos en el catálogo principal."
                />
              </Section>
      
              <Section
                id="designs"
                title="Diseños publicados"
                description="Elige cuáles diseños se publican aquí. Solo aparecen los diseños de los productos publicados en la tienda, y únicamente los terminados."
              >
                {form.productIds.length === 0 ? (
                  <div className="flex flex-col items-start gap-3">
                    <p className="text-sm text-neutral-500">
                      Primero elige los productos de la tienda; aquí solo se
                      muestran los diseños de esos productos.
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => changeSection("products")}
                    >
                      Ir a Productos
                    </Button>
                  </div>
                ) : (
                  <CatalogPicker
                    items={designItems}
                    selectedIds={form.designIds.filter((id) =>
                      designItems.some((item) => item.id === id)
                    )}
                    onChange={(ids) => patch("designIds", ids)}
                    emptyMessage="Los productos elegidos todavía no tienen diseños."
                  />
                )}
              </Section>
            </fieldset>
          </ActiveSectionContext.Provider>
            {canUpdate && !siteSection && !showNotifications && (
              <div className="flex items-center gap-3">
                <Button onClick={handleSave} disabled={saving || !dirty || blocked}>
                  {saving && <Loader2 className="size-4 animate-spin" />}
                  Guardar sección
                </Button>
                {dirty && !saving && (
                  <span className="text-xs text-neutral-500">
                    Cambios sin guardar
                  </span>
                )}
                {savedAt && !dirty && (
                  <span className="text-xs text-neutral-500">
                    Guardado · {savedAt}
                  </span>
                )}
              </div>
            )}
        </div>
      </div>
    </div>
  )
}

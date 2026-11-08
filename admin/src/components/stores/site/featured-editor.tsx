import {
  useContext,
  useEffect,
  useId,
  useMemo,
  useState,
  type ReactNode,
} from "react"
import { AlertCircle, Hand, Info, Loader2, Minus, Plus, Wand2 } from "lucide-react"

import { cn } from "@/lib/utils"
import { SortableList } from "@/components/ui/sortable"

import { apiFetch, ApiError } from "@/lib/api"
import { listDesigns } from "@/lib/designs-api"
import { listFits } from "@/lib/fit-categories-api"
import { listProducts } from "@/lib/products-api"
import type {
  DesignSummary,
  FeaturedSection,
  FeaturedSort,
  Fit,
  ProductSummary,
} from "@/types/api"
import {
  CatalogPicker,
  type CatalogItem,
} from "@/components/stores/catalog-picker"

import {
  FieldRow,
  LinkField,
  RemoveItemButton,
  Segmented,
  SelectField,
  TextField,
  type SelectOption,
} from "./fields"
import { SiteEditorContext } from "./site-context"

/** Máximo de productos de la sección (igual que en la API). */
export const MAX_FEATURED = 24

const SORT_OPTIONS: SelectOption<FeaturedSort>[] = [
  {
    value: "newest",
    label: "Más recientes primero",
    description: "Lo último que publicaste aparece al inicio. Ideal para «Novedades».",
  },
  {
    value: "oldest",
    label: "Más antiguos primero",
    description: "Tus diseños clásicos o de siempre al inicio.",
  },
  {
    value: "price-asc",
    label: "Precio: de menor a mayor",
    description: "Los más económicos primero. Útil para «Ofertas» o «Desde $…».",
  },
  {
    value: "price-desc",
    label: "Precio: de mayor a menor",
    description: "Los productos premium primero.",
  },
  {
    value: "random",
    label: "Aleatorio",
    description: "Cambia en cada visita: el cliente descubre productos distintos.",
  },
]

const SORT_PHRASE: Record<FeaturedSort, string> = {
  newest: "los más recientes primero",
  oldest: "los más antiguos primero",
  "price-asc": "los más económicos primero",
  "price-desc": "los de mayor precio primero",
  random: "en orden aleatorio",
}

/** Producto que devuelve el catálogo público (solo lo que usa la vista previa). */
interface PreviewItem {
  id: string
  name: string
  cover: string | null
}

/** Catálogo de la tienda para los filtros y la selección manual. */
function useStoreCatalog() {
  const { storeProductIds, storeDesignIds } = useContext(SiteEditorContext)
  const [fits, setFits] = useState<Fit[]>([])
  const [products, setProducts] = useState<ProductSummary[]>([])
  const [designs, setDesigns] = useState<DesignSummary[]>([])

  useEffect(() => {
    let active = true
    // Cada lista es opcional: sin permiso, el filtro queda sin opciones.
    void Promise.all([
      listFits().catch(() => [] as Fit[]),
      listProducts().catch(() => [] as ProductSummary[]),
      listDesigns().catch(() => [] as DesignSummary[]),
    ]).then(([f, p, d]) => {
      if (!active) return
      setFits(f)
      setProducts(p)
      setDesigns(d)
    })
    return () => {
      active = false
    }
  }, [])

  return useMemo(() => {
    const productSet = new Set(storeProductIds ?? [])
    const designSet = new Set(storeDesignIds ?? [])
    const storeProducts = products.filter((p) => productSet.has(p.id))
    // Solo diseños que la tienda muestra: publicados en ella, terminados y
    // sobre un producto que la tienda también publica.
    const storeDesigns = designs.filter(
      (d) =>
        designSet.has(d.id) &&
        d.status === "ready" &&
        productSet.has(d.productId)
    )
    return { fits, storeProducts, storeDesigns }
  }, [fits, products, designs, storeProductIds, storeDesignIds])
}

/** Resultado en vivo de la configuración, desde el catálogo público. */
function usePreview(section: FeaturedSection) {
  const { storeSlug } = useContext(SiteEditorContext)
  const [state, setState] = useState<{
    loading: boolean
    items: PreviewItem[]
    total: number
    error: string | null
  }>({ loading: true, items: [], total: 0, error: null })

  const query = useMemo(() => {
    const params = new URLSearchParams()
    if (storeSlug) params.set("store", storeSlug)
    params.set("limit", String(section.limit))
    if (section.mode === "manual") {
      if (section.designIds.length) {
        params.set("ids", section.designIds.slice(0, section.limit).join(","))
      }
    } else {
      if (section.fit) params.set("fit", section.fit)
      if (section.category.trim()) params.set("category", section.category.trim())
      if (section.query.trim()) params.set("q", section.query.trim())
      if (section.productId) params.set("product", section.productId)
      params.set("sort", section.sort)
    }
    return params.toString()
  }, [storeSlug, section])

  const emptyManual = section.mode === "manual" && section.designIds.length === 0

  useEffect(() => {
    if (!storeSlug || emptyManual) return
    let active = true
    // Espera a que se deje de escribir antes de consultar.
    const timer = window.setTimeout(() => {
      setState((s) => ({ ...s, loading: true, error: null }))
      apiFetch<{ items: PreviewItem[]; total: number }>(
        `/storefront/designs?${query}`
      )
        .then((res) => {
          if (active) {
            setState({
              loading: false,
              items: res.items,
              total: res.total,
              error: null,
            })
          }
        })
        .catch((err) => {
          if (!active) return
          setState({
            loading: false,
            items: [],
            total: 0,
            error:
              err instanceof ApiError && err.status === 404
                ? "La tienda está inactiva: activa la tienda para ver la vista previa."
                : "No se pudo cargar la vista previa.",
          })
        })
    }, 450)
    return () => {
      active = false
      window.clearTimeout(timer)
    }
  }, [query, storeSlug, emptyManual])

  if (!storeSlug) {
    return { loading: false, items: [], total: 0, error: null }
  }
  if (emptyManual) return { loading: false, items: [], total: 0, error: null }
  return state
}

function ResultsPreview({ section }: { section: FeaturedSection }) {
  const { loading, items, total, error } = usePreview(section)
  const shown = Math.min(total, section.limit)

  return (
    <div className="flex flex-col gap-3 rounded-xl bg-neutral-50 p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-neutral-900">
          Vista previa del resultado
        </p>
        {loading && (
          <Loader2 className="size-4 animate-spin text-neutral-400" aria-label="Cargando" />
        )}
      </div>
      {error ? (
        <p role="alert" className="flex items-center gap-1.5 text-xs text-amber-700">
          <AlertCircle className="size-3.5" />
          {error}
        </p>
      ) : !loading && total === 0 ? (
        <p className="text-xs text-neutral-500">
          {section.mode === "manual"
            ? "Elige al menos un diseño para mostrar la sección."
            : "Ningún producto coincide con estos filtros: la sección no se mostrará en la tienda."}
        </p>
      ) : (
        <>
          <p role="status" className="text-xs text-neutral-600">
            {section.mode === "manual"
              ? `Se mostrarán ${shown} ${shown === 1 ? "producto" : "productos"} en el orden elegido.`
              : `${total} ${total === 1 ? "producto coincide" : "productos coinciden"}; se mostrarán ${shown}.`}
          </p>
          <ul className="flex gap-2 overflow-x-auto pb-1" aria-label="Productos de la vista previa">
            {items.slice(0, section.limit).map((item) => (
              <li key={item.id} className="w-16 shrink-0" title={item.name}>
                {item.cover ? (
                  <img
                    src={item.cover}
                    alt={item.name}
                    className="aspect-[3/4] w-16 rounded-md border bg-white object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="aspect-[3/4] w-16 rounded-md bg-neutral-200" />
                )}
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  )
}

/** Diseños elegidos a mano: selector + lista ordenable. */
function ManualPicker({
  section,
  onChange,
  designs,
}: {
  section: FeaturedSection
  onChange: (s: FeaturedSection) => void
  designs: DesignSummary[]
}) {
  const byId = useMemo(() => new Map(designs.map((d) => [d.id, d])), [designs])
  const items = useMemo<CatalogItem[]>(
    () =>
      designs.map((d) => ({
        id: d.id,
        name: d.name,
        subtitle: d.productName,
        imageUrl: d.coverImageUrl,
      })),
    [designs]
  )
  // Ids que ya no están publicados en la tienda se conservan pero se avisan.
  const selected = section.designIds
  const missing = selected.filter((id) => !byId.has(id)).length
  const setIds = (designIds: string[]) =>
    onChange({ ...section, designIds: designIds.slice(0, MAX_FEATURED) })

  return (
    <div className="flex flex-col gap-4">
      {selected.length > 0 && (
        <div className="flex flex-col gap-2">
          <div>
            <p className="text-sm font-medium text-neutral-900">
              Orden en la tienda
            </p>
            <p className="text-xs text-neutral-500">
              Así aparecerán, de izquierda a derecha. Arrastra desde ⋮⋮ para
              cambiar el orden.
            </p>
          </div>
          <SortableList
            as="ol"
            items={selected}
            onReorder={setIds}
            itemLabel="diseño"
            getItemName={(id) => byId.get(id)?.name ?? "diseño"}
            className="divide-y overflow-hidden rounded-xl border bg-white"
            renderItem={(id, { handle, index }) => {
              const d = byId.get(id)
              return (
                <div className="flex items-center gap-2 bg-white py-1.5 pr-1 pl-1">
                  {handle}
                  <span className="w-5 shrink-0 text-xs font-semibold text-neutral-400">
                    {index + 1}
                  </span>
                  {d?.coverImageUrl ? (
                    <img
                      src={d.coverImageUrl}
                      alt=""
                      className="size-9 shrink-0 rounded-md border object-cover"
                    />
                  ) : (
                    <div className="size-9 shrink-0 rounded-md bg-neutral-100" />
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm">
                      {d ? d.name : "Diseño ya no publicado en la tienda"}
                    </span>
                    {d?.productName && (
                      <span className="block truncate text-xs text-neutral-500">
                        {d.productName}
                      </span>
                    )}
                  </span>
                  <RemoveItemButton
                    label={d?.name ?? "diseño"}
                    onRemove={() => setIds(selected.filter((x) => x !== id))}
                  />
                </div>
              )
            }}
          />
          {missing > 0 && (
            <p className="text-xs text-amber-700">
              {missing === 1
                ? "Un diseño ya no está publicado en la tienda y no se mostrará."
                : `${missing} diseños ya no están publicados en la tienda y no se mostrarán.`}
            </p>
          )}
        </div>
      )}
      <div className="flex flex-col gap-2">
        <div>
          <p className="text-sm font-medium text-neutral-900">
            Elige los diseños
          </p>
          <p className="text-xs text-neutral-500">
            Solo aparecen los diseños publicados en esta tienda. Los nuevos se
            agregan al final de la lista.
          </p>
        </div>
        <CatalogPicker
          items={items}
          selectedIds={selected.filter((id) => byId.has(id))}
          onChange={(ids) => {
            // Conserva el orden actual y agrega los nuevos al final.
            const keep = selected.filter((id) => ids.includes(id) || !byId.has(id))
            const added = ids.filter((id) => !selected.includes(id))
            setIds([...keep, ...added])
          }}
          emptyMessage="La tienda aún no publica diseños. Publícalos en la sección «Diseños»."
        />
        {selected.length >= MAX_FEATURED && (
          <p className="text-xs text-neutral-500">Máximo {MAX_FEATURED} diseños.</p>
        )}
      </div>
    </div>
  )
}

/** Paso numerado del formulario, con su explicación. */
function Step({
  n,
  title,
  description,
  children,
}: {
  n: number
  title: string
  description: string
  children: ReactNode
}) {
  return (
    <section className="flex flex-col gap-3 rounded-xl border p-4">
      <div className="flex items-start gap-3">
        <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-neutral-900 text-xs font-semibold text-white">
          {n}
        </span>
        <div>
          <h3 className="text-sm font-semibold text-neutral-900">{title}</h3>
          <p className="text-xs text-neutral-500">{description}</p>
        </div>
      </div>
      <div className="flex flex-col gap-4 sm:pl-9">{children}</div>
    </section>
  )
}

/** Tarjetas para elegir el modo, con su explicación. */
function ModePicker({
  value,
  onChange,
}: {
  value: FeaturedSection["mode"]
  onChange: (mode: FeaturedSection["mode"]) => void
}) {
  const name = useId()
  const { readOnly } = useContext(SiteEditorContext)
  const options = [
    {
      value: "auto" as const,
      icon: Wand2,
      title: "Automático",
      text: "Tú defines el criterio (por ejemplo «camisetas de hombre, las más nuevas») y la sección se llena sola. Cuando publiques diseños nuevos aparecerán sin que hagas nada.",
      best: "Ideal para «Novedades», «Más vendidos» o una categoría.",
    },
    {
      value: "manual" as const,
      icon: Hand,
      title: "Elegidos a mano",
      text: "Escoges uno por uno los diseños que quieres mostrar y el orden exacto. No cambia hasta que tú lo edites.",
      best: "Ideal para una colección especial o productos de temporada.",
    },
  ]
  return (
    <fieldset className="grid gap-3 sm:grid-cols-2" disabled={readOnly}>
      <legend className="sr-only">Cómo elegir los productos</legend>
      {options.map((o) => {
        const selected = value === o.value
        const Icon = o.icon
        return (
          <label
            key={o.value}
            className={cn(
              "relative flex cursor-pointer gap-3 rounded-xl border p-4 transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-neutral-400",
              selected
                ? "border-neutral-900 bg-neutral-50 ring-1 ring-neutral-900"
                : "hover:border-neutral-400"
            )}
          >
            <input
              type="radio"
              name={name}
              value={o.value}
              checked={selected}
              onChange={() => onChange(o.value)}
              className="sr-only"
            />
            <span
              className={cn(
                "flex size-9 shrink-0 items-center justify-center rounded-xl",
                selected ? "bg-neutral-900 text-white" : "bg-neutral-100 text-neutral-600"
              )}
            >
              <Icon className="size-4" />
            </span>
            <span className="flex flex-col gap-1">
              <span className="text-sm font-semibold text-neutral-900">{o.title}</span>
              <span className="text-xs leading-relaxed text-neutral-600">{o.text}</span>
              <span className="text-xs font-medium text-neutral-800">{o.best}</span>
            </span>
          </label>
        )
      })}
    </fieldset>
  )
}

/** Selector de cantidad con botones − / +. */
function LimitStepper({
  value,
  onChange,
}: {
  value: number
  onChange: (value: number) => void
}) {
  const id = useId()
  const { readOnly } = useContext(SiteEditorContext)
  const clamp = (n: number) => Math.min(MAX_FEATURED, Math.max(2, n))
  return (
    <div className="grid content-start gap-2">
      <label htmlFor={id} className="text-sm font-medium text-neutral-900">
        Cantidad máxima
      </label>
      <div className="flex w-fit items-center rounded-lg border bg-white">
        <button
          type="button"
          aria-label="Mostrar menos productos"
          disabled={readOnly || value <= 2}
          onClick={() => onChange(clamp(value - 1))}
          className="flex size-9 items-center justify-center text-neutral-600 hover:bg-neutral-50 focus-visible:ring-2 focus-visible:ring-neutral-400 focus-visible:outline-none disabled:opacity-40"
        >
          <Minus className="size-4" />
        </button>
        <input
          id={id}
          type="number"
          inputMode="numeric"
          min={2}
          max={MAX_FEATURED}
          value={value}
          disabled={readOnly}
          onChange={(e) => {
            const n = Number(e.target.value)
            if (Number.isFinite(n)) onChange(clamp(n))
          }}
          className="h-9 w-14 border-x text-center text-sm outline-none [appearance:textfield] focus-visible:bg-neutral-50 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
        />
        <button
          type="button"
          aria-label="Mostrar más productos"
          disabled={readOnly || value >= MAX_FEATURED}
          onClick={() => onChange(clamp(value + 1))}
          className="flex size-9 items-center justify-center text-neutral-600 hover:bg-neutral-50 focus-visible:ring-2 focus-visible:ring-neutral-400 focus-visible:outline-none disabled:opacity-40"
        >
          <Plus className="size-4" />
        </button>
      </div>
      <p className="text-xs text-neutral-500">
        Entre 2 y {MAX_FEATURED}. Si hay menos productos, se muestran los que
        haya.
      </p>
    </div>
  )
}

/** Frase que resume la configuración, para confirmar qué se mostrará. */
function describeAuto(
  section: FeaturedSection,
  fitName: string | undefined,
  productName: string | undefined
): string {
  const parts: string[] = []
  if (productName) parts.push(`del producto «${productName}»`)
  if (fitName) parts.push(`del ajuste ${fitName}`)
  if (section.category.trim()) parts.push(`de la categoría «${section.category.trim()}»`)
  if (section.query.trim()) parts.push(`que contengan «${section.query.trim()}»`)
  const filters = parts.length ? parts.join(", ") : "de todo el catálogo de la tienda"
  return `Se mostrarán hasta ${section.limit} productos ${filters}, ${SORT_PHRASE[section.sort]}.`
}

/** Formulario de la sección «Productos destacados». */
export function FeaturedFields({
  section,
  onChange,
}: {
  section: FeaturedSection
  onChange: (s: FeaturedSection) => void
}) {
  const { fits, storeProducts, storeDesigns } = useStoreCatalog()
  const set = (patch: Partial<FeaturedSection>) =>
    onChange({ ...section, ...patch })

  const fitOptions: SelectOption<string>[] = [
    {
      value: "",
      label: "Todos los ajustes",
      description: "No filtra por ajuste: muestra hombre, mujer, kids… juntos.",
    },
    ...fits.map((f) => ({ value: f.key as string, label: f.name })),
  ]
  if (section.fit && !fits.some((f) => f.key === section.fit)) {
    fitOptions.push({
      value: section.fit,
      label: `${section.fit} (ya no existe)`,
      description: "Este ajuste fue eliminado: elige otro o «Todos».",
    })
  }
  const productOptions: SelectOption<string>[] = [
    {
      value: "",
      label: "Todos los productos",
      description: "Cualquier prenda que publique la tienda.",
    },
    ...storeProducts.map((p) => ({ value: p.id, label: p.name })),
  ]
  if (section.productId && !storeProducts.some((p) => p.id === section.productId)) {
    productOptions.push({
      value: section.productId,
      label: "Producto no publicado",
      description: "Ya no está en la tienda: elige otro o «Todos».",
    })
  }
  const fitName = fits.find((f) => f.key === section.fit)?.name
  const productName = storeProducts.find((p) => p.id === section.productId)?.name

  return (
    <div className="flex flex-col gap-4">
      <FieldRow>
        <TextField
          label="Título de la sección"
          value={section.title}
          onChange={(title) => set({ title })}
          maxLength={80}
          placeholder="Lo más nuevo"
          hint="Aparece grande arriba de los productos."
        />
        <TextField
          label="Subtítulo (opcional)"
          value={section.subtitle}
          onChange={(subtitle) => set({ subtitle })}
          maxLength={200}
          placeholder="Diseños recién llegados"
          hint="Una línea corta debajo del título."
        />
      </FieldRow>

      <Step
        n={1}
        title="¿Cómo eliges los productos?"
        description="Puedes cambiar de modo cuando quieras; lo que configures en cada uno se conserva."
      >
        <ModePicker value={section.mode} onChange={(mode) => set({ mode })} />
      </Step>

      {section.mode === "auto" ? (
        <Step
          n={2}
          title="Define el criterio"
          description="Solo se muestran productos que cumplan TODOS los filtros que elijas. Deja un filtro en «Todos» o vacío para no usarlo."
        >
          <FieldRow>
            <SelectField
              label="Ajuste"
              value={section.fit}
              onChange={(fit) => set({ fit })}
              options={fitOptions}
              hint="Para quién es: Hombre, Mujer, Kids…"
            />
            <SelectField
              label="Prenda"
              value={section.productId}
              onChange={(productId) => set({ productId })}
              options={productOptions}
              hint="Una prenda específica (por ejemplo, solo hoodies)."
            />
          </FieldRow>
          <FieldRow>
            <TextField
              label="Categoría"
              value={section.category}
              onChange={(category) => set({ category })}
              maxLength={60}
              placeholder="Ej.: Camiseta"
              hint="Escríbela igual que en el producto. Vacío = todas."
            />
            <TextField
              label="Palabra clave"
              value={section.query}
              onChange={(query) => set({ query })}
              maxLength={80}
              placeholder="Ej.: anime"
              hint="Busca la palabra en el nombre del diseño o de la prenda."
            />
          </FieldRow>
          <SelectField
            label="Orden"
            value={section.sort}
            onChange={(sort) => set({ sort })}
            options={SORT_OPTIONS}
            hint="Qué productos aparecen primero."
            className="sm:max-w-sm"
          />
          <p className="flex items-start gap-2 rounded-lg bg-neutral-50 px-3 py-2 text-xs text-neutral-700">
            <Info className="mt-px size-3.5 shrink-0" aria-hidden="true" />
            {describeAuto(section, fitName, productName)}
          </p>
        </Step>
      ) : (
        <Step
          n={2}
          title="Elige y ordena los diseños"
          description="Marca los diseños que quieres mostrar. Después arrástralos para definir en qué orden aparecen."
        >
          <ManualPicker section={section} onChange={onChange} designs={storeDesigns} />
        </Step>
      )}

      <Step
        n={3}
        title="¿Cómo se ve?"
        description="En computadora se muestran en cuadrícula; en el celular, en un carrusel que se desliza con el dedo."
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <LimitStepper value={section.limit} onChange={(limit) => set({ limit })} />
          <Segmented
            label="Productos por fila (computadora)"
            value={String(section.columns) as "3" | "4" | "5"}
            onChange={(c) => set({ columns: Number(c) as 3 | 4 | 5 })}
            options={[
              { value: "3", label: "3 · grandes" },
              { value: "4", label: "4" },
              { value: "5", label: "5 · pequeños" },
            ]}
            hint="Más productos por fila = tarjetas más pequeñas."
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Segmented
            label="Imagen que se muestra"
            value={section.image ?? "1"}
            onChange={(image) => set({ image })}
            options={[
              { value: "1", label: "1.ª" },
              { value: "2", label: "2.ª" },
              { value: "3", label: "3.ª" },
              { value: "random", label: "Aleatoria" },
            ]}
            hint="Cada producto tiene varias fotos; elige cuál se ve en la tarjeta. Si un producto no tiene esa foto, se usa la primera. En el celular se ve solo esta imagen para que el carrusel se pueda deslizar."
          />
          {(section.image ?? "1") === "random" && (
            <Segmented
              label="Nunca mostrar la foto"
              value={String(section.randomExclude ?? 0) as "0" | "1" | "2" | "3"}
              onChange={(v) => set({ randomExclude: Number(v) as 0 | 1 | 2 | 3 })}
              options={[
                { value: "0", label: "Ninguna" },
                { value: "1", label: "1.ª" },
                { value: "2", label: "2.ª" },
                { value: "3", label: "3.ª" },
              ]}
              hint="La aleatoria elige entre las demás fotos (útil para no repetir siempre la foto de portada). Cambia en cada visita."
            />
          )}
        </div>
        <ResultsPreview section={section} />
      </Step>

      <Step
        n={4}
        title="Botón «Ver más» (opcional)"
        description="Un botón junto al título para llevar al catálogo completo. Déjalo vacío si no lo quieres."
      >
        <FieldRow>
          <TextField
            label="Texto del botón"
            value={section.ctaLabel}
            onChange={(ctaLabel) => set({ ctaLabel })}
            maxLength={40}
            placeholder="Ver todo"
          />
          <LinkField
            label="¿A dónde lleva?"
            value={section.ctaUrl}
            onChange={(ctaUrl) => set({ ctaUrl })}
            hint="Escribe o elige una página, por ejemplo /tienda."
          />
        </FieldRow>
      </Step>
    </div>
  )
}

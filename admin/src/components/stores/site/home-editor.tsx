import { useContext, useState } from "react"
import {
  ChevronDown,
  ChevronUp,
  Eye,
  GripVertical,
  Image as ImageIcon,
  Info,
  LayoutGrid,
  PanelTop,
  Plus,
  Sparkles,
  Type,
  type LucideIcon,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { SortableList } from "@/components/ui/sortable"
import type {
  BannerSection,
  CategoriesSection,
  CategoryTileConfig,
  DefaultTileImage,
  HeroSection,
  HomeSection,
  TextSection,
} from "@/types/api"

import {
  Card,
  FieldRow,
  ImageField,
  LinkField,
  LinkList,
  RemoveItemButton,
  RepeatableList,
  Segmented,
  SelectField,
  type SelectOption,
  SwitchField,
  TextAreaField,
  TextField,
} from "./fields"
import { FeaturedFields } from "./featured-editor"
import { SiteEditorContext } from "./site-context"

interface Props {
  value: { sections: HomeSection[] }
  onChange: (value: { sections: HomeSection[] }) => void
}

type SectionType = HomeSection["type"]

const TYPE_META: Record<
  SectionType,
  {
    label: string
    description: string
    /** Explicación que se muestra al abrir la sección. */
    help: string
    icon: LucideIcon
    removable: boolean
  }
> = {
  hero: {
    label: "Portada",
    description: "Imagen principal con título, buscador y atajos.",
    help: "Es lo primero que ve el cliente al entrar. Usa un título corto que diga qué vendes y una imagen de buena calidad. El buscador lleva al catálogo con lo que escriban.",
    icon: ImageIcon,
    removable: false,
  },
  categories: {
    label: "Categorías",
    description: "Bloques grandes que llevan a cada sección del catálogo.",
    help: "Cada bloque es una puerta de entrada a una parte del catálogo (Mujer, Hombre, Kids…). Ocupan toda la pantalla, así que conviene mostrar solo las principales.",
    icon: LayoutGrid,
    removable: false,
  },
  featured: {
    label: "Productos destacados",
    description: "Una vitrina de productos: automática o elegida a mano.",
    help: "Muestra productos de la tienda en una cuadrícula (en el móvil, en un carrusel que se desliza). Puedes dejar que se llene sola con un criterio o elegir los productos uno por uno.",
    icon: Sparkles,
    removable: true,
  },
  banner: {
    label: "Banner",
    description: "Imagen con título, texto y botón.",
    help: "Ideal para promociones, lanzamientos o una colección. Si no subes imagen se muestra un fondo liso con tu color de marca.",
    icon: PanelTop,
    removable: true,
  },
  text: {
    label: "Bloque de texto",
    description: "Título y texto libre (sobre la marca, mensajes, etc.).",
    help: "Para contar quiénes son, cómo trabajan o cualquier mensaje. Admite formato simple: subtítulos, negrita, listas y enlaces.",
    icon: Type,
    removable: true,
  },
}

const ADDABLE: SectionType[] = ["featured", "banner", "text"]

function newId(type: SectionType): string {
  return `${type}-${Math.random().toString(36).slice(2, 7)}`
}

function createSection(type: SectionType): HomeSection {
  const base = { id: newId(type), enabled: true }
  switch (type) {
    case "featured":
      return {
        ...base,
        type,
        title: "Lo más nuevo",
        subtitle: "",
        mode: "auto",
        fit: "",
        category: "",
        query: "",
        productId: "",
        sort: "newest",
        designIds: [],
        limit: 8,
        columns: 4,
        image: "1",
        randomExclude: 0,
        ctaLabel: "Ver todo",
        ctaUrl: "/tienda",
      }
    case "banner":
      return {
        ...base,
        type,
        title: "",
        text: "",
        imageUrl: "",
        mobileImageUrl: "",
        buttonLabel: "",
        buttonUrl: "",
        align: "left",
      }
    case "text":
      return { ...base, type, title: "", body: "", align: "left" }
    default:
      throw new Error(`No se puede crear una sección de tipo ${type}`)
  }
}

/** Resumen de una línea para la cabecera de cada sección. */
function summary(section: HomeSection): string {
  switch (section.type) {
    case "hero":
      return section.titleLine || TYPE_META.hero.description
    case "categories":
      return `${section.tiles.filter((t) => t.enabled).length} de ${section.tiles.length} categorías visibles`
    case "featured":
      return section.title || TYPE_META.featured.description
    case "banner":
      return section.title || TYPE_META.banner.description
    case "text":
      return section.title || TYPE_META.text.description
  }
}

// ---------------------------------------------------------------------------
// Editor principal
// ---------------------------------------------------------------------------

/** Secciones del home: orden, visibilidad y contenido de cada una. */
export function HomeEditor({ value, onChange }: Props) {
  const sections = value.sections
  const [openId, setOpenId] = useState<string | null>(sections[0]?.id ?? null)
  const { readOnly } = useContext(SiteEditorContext)

  const setSections = (next: HomeSection[]) => onChange({ sections: next })
  const update = (index: number, section: HomeSection) =>
    setSections(sections.map((s, i) => (i === index ? section : s)))
  const remove = (index: number) =>
    setSections(sections.filter((_, i) => i !== index))
  function add(type: SectionType) {
    const section = createSection(type)
    setSections([...sections, section])
    setOpenId(section.id)
  }

  return (
    <div className="flex flex-col gap-4">
      <Card
        title="Secciones de la página de inicio"
        description="La página de inicio se arma con estas secciones, de arriba hacia abajo, entre el encabezado y el pie de página."
        className="gap-3"
      >
        <ul className="grid gap-1.5 rounded-xl bg-neutral-50 p-3 text-xs text-neutral-600 sm:grid-cols-3">
          <li className="flex items-start gap-2">
            <GripVertical className="mt-px size-3.5 shrink-0 text-neutral-400" aria-hidden="true" />
            <span><strong className="font-medium text-neutral-800">Ordena</strong> arrastrando desde ⋮⋮.</span>
          </li>
          <li className="flex items-start gap-2">
            <Eye className="mt-px size-3.5 shrink-0 text-neutral-400" aria-hidden="true" />
            <span><strong className="font-medium text-neutral-800">Oculta</strong> una sección con su interruptor sin perder lo que configuraste.</span>
          </li>
          <li className="flex items-start gap-2">
            <ChevronDown className="mt-px size-3.5 shrink-0 text-neutral-400" aria-hidden="true" />
            <span><strong className="font-medium text-neutral-800">Edita</strong> haciendo clic en su nombre.</span>
          </li>
        </ul>

        <SortableList
          items={sections}
          onReorder={setSections}
          itemLabel="sección"
          getItemName={(s) => TYPE_META[s.type].label}
          disabled={readOnly}
          className="flex flex-col gap-3"
          renderItem={(section, { handle, index }) => {
            const meta = TYPE_META[section.type]
            const Icon = meta.icon
            const open = openId === section.id
            return (
              <div
                className={cn(
                  "rounded-2xl border bg-white",
                  !section.enabled && "bg-neutral-50"
                )}
              >
                <div className="flex items-center gap-1.5 p-2 pr-3">
                  {handle}
                  <button
                    type="button"
                    onClick={() => setOpenId(open ? null : section.id)}
                    aria-expanded={open}
                    aria-controls={`home-section-${section.id}`}
                    className="flex min-w-0 flex-1 items-center gap-3 rounded-lg p-1 text-left focus-visible:ring-2 focus-visible:ring-neutral-400 focus-visible:outline-none"
                  >
                    <span
                      className={cn(
                        "flex size-9 shrink-0 items-center justify-center rounded-xl",
                        section.enabled
                          ? "bg-neutral-900 text-white"
                          : "bg-neutral-200 text-neutral-500"
                      )}
                    >
                      <Icon className="size-4" />
                    </span>
                    <span className="min-w-0">
                      <span className="flex items-center gap-2 text-sm font-semibold text-neutral-900">
                        <span className="text-xs font-medium text-neutral-400">
                          {index + 1}.
                        </span>
                        {meta.label}
                        {!section.enabled && (
                          <span className="rounded-full bg-neutral-200 px-2 py-0.5 text-[10px] font-medium text-neutral-600 uppercase">
                            Oculta
                          </span>
                        )}
                      </span>
                      <span className="block truncate text-xs text-neutral-500">
                        {summary(section)}
                      </span>
                    </span>
                    {open ? (
                      <ChevronUp className="ml-auto size-4 shrink-0 text-neutral-400" />
                    ) : (
                      <ChevronDown className="ml-auto size-4 shrink-0 text-neutral-400" />
                    )}
                  </button>

                  <button
                    type="button"
                    role="switch"
                    aria-checked={section.enabled}
                    aria-label={`Mostrar la sección ${meta.label} en la tienda`}
                    title={section.enabled ? "Visible en la tienda" : "Oculta en la tienda"}
                    disabled={readOnly}
                    onClick={() =>
                      update(index, { ...section, enabled: !section.enabled })
                    }
                    className={cn(
                      "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus-visible:ring-2 focus-visible:ring-neutral-400 focus-visible:outline-none disabled:opacity-50",
                      section.enabled ? "bg-neutral-900" : "bg-neutral-300"
                    )}
                  >
                    <span
                      className={cn(
                        "inline-block size-5 rounded-full bg-white shadow transition-transform",
                        section.enabled ? "translate-x-5" : "translate-x-0.5"
                      )}
                    />
                  </button>
                  {meta.removable && (
                    <RemoveItemButton
                      label={`la sección ${meta.label}`}
                      onRemove={() => remove(index)}
                    />
                  )}
                </div>

                {open && (
                  <div
                    id={`home-section-${section.id}`}
                    className="flex flex-col gap-4 border-t p-4"
                  >
                    <p className="flex items-start gap-2 rounded-xl bg-sky-50 p-3 text-xs leading-relaxed text-sky-900">
                      <Info className="mt-px size-3.5 shrink-0" aria-hidden="true" />
                      {meta.help}
                    </p>
                    <SectionBody
                      section={section}
                      onChange={(s) => update(index, s)}
                    />
                  </div>
                )}
              </div>
            )
          }}
        />
      </Card>

      {!readOnly && (
        <Card
          title="Agregar una sección"
          description="Se agrega al final de la página; luego arrástrala al lugar que quieras."
        >
          <div className="grid gap-3 sm:grid-cols-3">
            {ADDABLE.map((type) => {
              const meta = TYPE_META[type]
              const Icon = meta.icon
              return (
                <button
                  key={type}
                  type="button"
                  disabled={sections.length >= 12}
                  onClick={() => add(type)}
                  className="group flex flex-col items-start gap-2 rounded-xl border bg-white p-4 text-left transition-colors hover:border-neutral-900 focus-visible:ring-2 focus-visible:ring-neutral-400 focus-visible:outline-none disabled:opacity-50"
                >
                  <span className="flex size-9 items-center justify-center rounded-xl bg-neutral-100 text-neutral-700 group-hover:bg-neutral-900 group-hover:text-white">
                    <Icon className="size-4" />
                  </span>
                  <span className="text-sm font-semibold text-neutral-900">
                    {meta.label}
                  </span>
                  <span className="text-xs text-neutral-500">
                    {meta.description}
                  </span>
                  <span className="mt-auto inline-flex items-center gap-1 pt-1 text-xs font-medium text-neutral-900">
                    <Plus className="size-3.5" /> Agregar
                  </span>
                </button>
              )
            })}
          </div>
          {sections.length >= 12 && (
            <p className="text-xs text-neutral-500">
              Llegaste al máximo de 12 secciones.
            </p>
          )}
        </Card>
      )}
    </div>
  )
}

function SectionBody({
  section,
  onChange,
}: {
  section: HomeSection
  onChange: (section: HomeSection) => void
}) {
  switch (section.type) {
    case "hero":
      return <HeroFields section={section} onChange={onChange} />
    case "categories":
      return <CategoriesFields section={section} onChange={onChange} />
    case "featured":
      return <FeaturedFields section={section} onChange={onChange} />
    case "banner":
      return <BannerFields section={section} onChange={onChange} />
    case "text":
      return <TextFields section={section} onChange={onChange} />
  }
}

// ---------------------------------------------------------------------------
// Formularios por tipo
// ---------------------------------------------------------------------------

function HeroFields({
  section,
  onChange,
}: {
  section: HeroSection
  onChange: (s: HeroSection) => void
}) {
  const set = (patch: Partial<HeroSection>) => onChange({ ...section, ...patch })
  return (
    <>
      <TextField
        label="Frase superior"
        value={section.kicker}
        onChange={(kicker) => set({ kicker })}
        maxLength={60}
        hint="Si la dejas vacía se usa el eslogan de la tienda."
      />
      <FieldRow>
        <TextField
          label="Título"
          value={section.titleLine}
          onChange={(titleLine) => set({ titleLine })}
          maxLength={100}
        />
        <TextField
          label="Parte destacada del título"
          value={section.titleAccent}
          onChange={(titleAccent) => set({ titleAccent })}
          maxLength={60}
          hint="Se muestra en el color de marca, en una segunda línea."
        />
      </FieldRow>
      <TextAreaField
        label="Subtítulo"
        value={section.subtitle}
        onChange={(subtitle) => set({ subtitle })}
        maxLength={240}
        rows={2}
      />
      <TextField
        label="Texto del buscador"
        value={section.searchPlaceholder}
        onChange={(searchPlaceholder) => set({ searchPlaceholder })}
        maxLength={80}
        placeholder="Quiero una camiseta minimalista…"
        hint="El texto gris dentro del buscador, antes de que el cliente escriba. Dale una idea de qué puede buscar."
      />
      <TextAreaField
        label="Ejemplos que se escriben solos en el buscador"
        value={section.suggestions.join("\n")}
        onChange={(text) => set({ suggestions: text.split("\n") })}
        rows={4}
        hint="Se van escribiendo y borrando solas dentro del buscador para inspirar al cliente. Una por línea (hasta 10)."
      />
      <div className="grid gap-2">
        <div>
          <p className="text-sm font-medium text-neutral-900">
            Atajos populares
          </p>
          <p className="text-xs text-neutral-500">
            Botones pequeños debajo del buscador con búsquedas frecuentes (por
            ejemplo «Anime» → /tienda?q=anime). Ayudan a quien no sabe qué
            buscar.
          </p>
        </div>
        <LinkList
          items={section.chips}
          onChange={(chips) => set({ chips })}
          max={8}
          itemLabel="atajo"
          addLabel="Agregar atajo"
          emptyLabel="Sin atajos."
          newItem={{ label: "", url: "/tienda?q=" }}
        />
      </div>
      <FieldRow>
        <ImageField
          label="Imagen de fondo (escritorio)"
          value={section.imageUrl}
          onChange={(imageUrl) => set({ imageUrl })}
          emptyLabel="Imagen por defecto"
          hint="Apaisada, mínimo 1920×1080."
        />
        <ImageField
          label="Imagen de fondo (móvil)"
          value={section.mobileImageUrl}
          onChange={(mobileImageUrl) => set({ mobileImageUrl })}
          emptyLabel="Imagen por defecto"
          hint="Vertical, por ejemplo 1080×1920."
        />
      </FieldRow>
    </>
  )
}

const TILE_IMAGE_OPTIONS: SelectOption<DefaultTileImage>[] = [
  { value: "", label: "Ninguna", description: "Si no subes una imagen, el bloque queda en negro." },
  { value: "bg_mujer", label: "Mujer", description: "Foto de ejemplo de la línea de mujer." },
  { value: "bg_familia", label: "Familiar", description: "Foto de ejemplo de looks a juego." },
  { value: "bg_hombre", label: "Hombre", description: "Foto de ejemplo de la línea de hombre." },
  { value: "bg_hoodie", label: "Unisex (hoodie)", description: "Foto de ejemplo de básicos sin género." },
  { value: "bg_kids", label: "Kids", description: "Foto de ejemplo de la línea infantil." },
]

function CategoriesFields({
  section,
  onChange,
}: {
  section: CategoriesSection
  onChange: (s: CategoriesSection) => void
}) {
  return (
    <RepeatableList<CategoryTileConfig>
      items={section.tiles}
      onChange={(tiles) => onChange({ ...section, tiles })}
      createItem={() => ({
        id: `categoria-${Math.random().toString(36).slice(2, 7)}`,
        enabled: true,
        title: "",
        kicker: "",
        cta: "Ver más",
        url: "/tienda",
        imageUrl: "",
        mobileImageUrl: "",
        defaultImage: "",
      })}
      max={8}
      itemLabel="categoría"
      itemTitle={(tile) => tile.title}
      addLabel="Agregar categoría"
      emptyLabel="Sin categorías."
      renderItem={(tile, update) => (
        <div className="flex flex-col gap-3">
          <SwitchField
            label="Mostrar esta categoría"
            checked={tile.enabled}
            onChange={(enabled) => update({ enabled })}
          />
          <FieldRow>
            <TextField
              label="Título"
              value={tile.title}
              onChange={(title) => update({ title })}
              maxLength={40}
            />
            <TextField
              label="Frase superior"
              value={tile.kicker}
              onChange={(kicker) => update({ kicker })}
              maxLength={60}
            />
          </FieldRow>
          <FieldRow>
            <TextField
              label="Texto del botón"
              value={tile.cta}
              onChange={(cta) => update({ cta })}
              maxLength={40}
            />
            <LinkField
              label="Destino"
              value={tile.url}
              onChange={(url) => update({ url })}
            />
          </FieldRow>
          <FieldRow>
            <ImageField
              label="Imagen (escritorio)"
              value={tile.imageUrl}
              onChange={(imageUrl) => update({ imageUrl })}
              emptyLabel="Imagen por defecto"
            />
            <ImageField
              label="Imagen (móvil)"
              value={tile.mobileImageUrl}
              onChange={(mobileImageUrl) => update({ mobileImageUrl })}
              emptyLabel="Imagen por defecto"
            />
          </FieldRow>
          <SelectField<DefaultTileImage>
            label="Foto de ejemplo (mientras no subas la tuya)"
            value={tile.defaultImage}
            onChange={(defaultImage) => update({ defaultImage })}
            options={TILE_IMAGE_OPTIONS}
            hint="Fotos incluidas para que la tienda se vea completa desde el primer día. Al subir tu imagen, esta deja de usarse."
          />
        </div>
      )}
    />
  )
}

function BannerFields({
  section,
  onChange,
}: {
  section: BannerSection
  onChange: (s: BannerSection) => void
}) {
  const set = (patch: Partial<BannerSection>) =>
    onChange({ ...section, ...patch })
  return (
    <>
      <TextField
        label="Título"
        value={section.title}
        onChange={(title) => set({ title })}
        maxLength={100}
      />
      <TextAreaField
        label="Texto"
        value={section.text}
        onChange={(text) => set({ text })}
        maxLength={300}
        rows={3}
      />
      <FieldRow>
        <TextField
          label="Texto del botón"
          value={section.buttonLabel}
          onChange={(buttonLabel) => set({ buttonLabel })}
          maxLength={40}
          hint="Vacío = sin botón."
        />
        <LinkField
          label="Destino del botón"
          value={section.buttonUrl}
          onChange={(buttonUrl) => set({ buttonUrl })}
        />
      </FieldRow>
      <Segmented<BannerSection["align"]>
        label="Posición del texto"
        value={section.align}
        onChange={(align) => set({ align })}
        options={[
          { value: "left", label: "Izquierda" },
          { value: "center", label: "Centro" },
          { value: "right", label: "Derecha" },
        ]}
        hint="Coloca el texto donde no tape lo importante de la imagen."
      />
      <FieldRow>
        <ImageField
          label="Imagen (escritorio)"
          value={section.imageUrl}
          onChange={(imageUrl) => set({ imageUrl })}
          emptyLabel="Fondo oscuro"
          hint="Sin imagen se muestra un fondo liso."
        />
        <ImageField
          label="Imagen (móvil)"
          value={section.mobileImageUrl}
          onChange={(mobileImageUrl) => set({ mobileImageUrl })}
          emptyLabel="Usa la de escritorio"
        />
      </FieldRow>
    </>
  )
}

function TextFields({
  section,
  onChange,
}: {
  section: TextSection
  onChange: (s: TextSection) => void
}) {
  const set = (patch: Partial<TextSection>) => onChange({ ...section, ...patch })
  return (
    <>
      <TextField
        label="Título"
        value={section.title}
        onChange={(title) => set({ title })}
        maxLength={100}
      />
      <TextAreaField
        label="Contenido"
        value={section.body}
        onChange={(body) => set({ body })}
        maxLength={10000}
        rows={8}
        hint="Formato: ## Subtítulo, **negrita**, *cursiva*, listas con «- » y enlaces [texto](url)."
      />
      <Segmented<TextSection["align"]>
        label="Alineación"
        value={section.align}
        onChange={(align) => set({ align })}
        options={[
          { value: "left", label: "Izquierda" },
          { value: "center", label: "Centrado" },
        ]}
        hint="Centrado queda mejor para textos cortos; a la izquierda, para textos largos."
      />
    </>
  )
}

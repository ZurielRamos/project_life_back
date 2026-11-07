import { useState } from "react"
import {
  ArrowDown,
  ArrowUp,
  ChevronDown,
  ChevronUp,
  Image as ImageIcon,
  LayoutGrid,
  PanelTop,
  Plus,
  Sparkles,
  Trash2,
  Type,
  type LucideIcon,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import type {
  BannerSection,
  CategoriesSection,
  CategoryTileConfig,
  DefaultTileImage,
  FeaturedSection,
  HeroSection,
  HomeSection,
  TextSection,
} from "@/types/api"

import {
  Card,
  FieldRow,
  ImageField,
  LinkField,
  NumberField,
  RepeatableList,
  SelectField,
  SwitchField,
  TextAreaField,
  TextField,
} from "./fields"

interface Props {
  value: { sections: HomeSection[] }
  onChange: (value: { sections: HomeSection[] }) => void
}

type SectionType = HomeSection["type"]

const TYPE_META: Record<
  SectionType,
  { label: string; description: string; icon: LucideIcon; removable: boolean }
> = {
  hero: {
    label: "Portada",
    description: "Imagen principal con título, buscador y atajos.",
    icon: ImageIcon,
    removable: false,
  },
  categories: {
    label: "Categorías",
    description: "Bloques grandes que llevan a cada sección del catálogo.",
    icon: LayoutGrid,
    removable: false,
  },
  featured: {
    label: "Productos destacados",
    description: "Cuadrícula con los diseños más recientes de la tienda.",
    icon: Sparkles,
    removable: true,
  },
  banner: {
    label: "Banner",
    description: "Imagen con título, texto y botón.",
    icon: PanelTop,
    removable: true,
  },
  text: {
    label: "Bloque de texto",
    description: "Título y texto libre (sobre la marca, mensajes, etc.).",
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
        limit: 8,
        fit: "",
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
  const [toAdd, setToAdd] = useState<SectionType>("featured")

  const setSections = (next: HomeSection[]) => onChange({ sections: next })

  function update(index: number, section: HomeSection) {
    setSections(sections.map((s, i) => (i === index ? section : s)))
  }
  function move(index: number, delta: -1 | 1) {
    const target = index + delta
    if (target < 0 || target >= sections.length) return
    const next = [...sections]
    ;[next[index], next[target]] = [next[target], next[index]]
    setSections(next)
  }
  function remove(index: number) {
    setSections(sections.filter((_, i) => i !== index))
  }
  function add() {
    const section = createSection(toAdd)
    setSections([...sections, section])
    setOpenId(section.id)
  }

  return (
    <div className="flex flex-col gap-4">
      <Card
        title="Secciones de la página de inicio"
        description="Ordena, activa y edita las secciones. Se muestran de arriba hacia abajo, entre el encabezado y el pie de página."
        className="gap-3"
      >
        <ul className="flex flex-col gap-3">
          {sections.map((section, index) => {
            const meta = TYPE_META[section.type]
            const Icon = meta.icon
            const open = openId === section.id
            return (
              <li
                key={section.id}
                className={cn(
                  "rounded-2xl border bg-white",
                  !section.enabled && "bg-neutral-50"
                )}
              >
                <div className="flex items-center gap-2 p-3">
                  <button
                    type="button"
                    onClick={() => setOpenId(open ? null : section.id)}
                    aria-expanded={open}
                    aria-controls={`home-section-${section.id}`}
                    className="flex min-w-0 flex-1 items-center gap-3 rounded-lg p-1 text-left"
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
                      <span className="block text-sm font-semibold text-neutral-900">
                        {meta.label}
                        {!section.enabled && (
                          <span className="ml-2 text-xs font-normal text-neutral-500">
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
                    aria-label={`Mostrar sección ${meta.label}`}
                    onClick={() =>
                      update(index, { ...section, enabled: !section.enabled })
                    }
                    className={cn(
                      "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors",
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
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-8"
                    aria-label={`Subir ${meta.label}`}
                    disabled={index === 0}
                    onClick={() => move(index, -1)}
                  >
                    <ArrowUp className="size-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-8"
                    aria-label={`Bajar ${meta.label}`}
                    disabled={index === sections.length - 1}
                    onClick={() => move(index, 1)}
                  >
                    <ArrowDown className="size-4" />
                  </Button>
                  {meta.removable && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:text-destructive size-8"
                      aria-label={`Eliminar ${meta.label}`}
                      onClick={() => remove(index)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  )}
                </div>

                {open && (
                  <div
                    id={`home-section-${section.id}`}
                    className="flex flex-col gap-4 border-t p-4"
                  >
                    <SectionBody
                      section={section}
                      onChange={(s) => update(index, s)}
                    />
                  </div>
                )}
              </li>
            )
          })}
        </ul>

        <div className="flex flex-wrap items-end gap-3 border-t pt-4">
          <SelectField<SectionType>
            label="Agregar sección"
            value={toAdd}
            onChange={setToAdd}
            options={ADDABLE.map((t) => ({
              value: t,
              label: TYPE_META[t].label,
            }))}
            className="w-64"
          />
          <Button
            type="button"
            variant="outline"
            disabled={sections.length >= 12}
            onClick={add}
          >
            <Plus className="size-4" />
            Agregar
          </Button>
          <p className="pb-2 text-xs text-neutral-500">
            {TYPE_META[toAdd].description}
          </p>
        </div>
      </Card>
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
      />
      <TextAreaField
        label="Ejemplos que se escriben solos en el buscador"
        value={section.suggestions.join("\n")}
        onChange={(text) => set({ suggestions: text.split("\n") })}
        rows={4}
        hint="Uno por línea (hasta 10)."
      />
      <div className="grid gap-2">
        <p className="text-sm font-medium text-neutral-900">
          Atajos populares
        </p>
        <RepeatableList
          items={section.chips}
          onChange={(chips) => set({ chips })}
          createItem={() => ({ label: "", url: "/tienda?q=" })}
          max={8}
          itemLabel="atajo"
          addLabel="Agregar atajo"
          emptyLabel="Sin atajos."
          renderItem={(chip, update) => (
            <FieldRow>
              <TextField
                label="Texto"
                value={chip.label}
                onChange={(label) => update({ label })}
                maxLength={60}
              />
              <LinkField
                label="Destino"
                value={chip.url}
                onChange={(url) => update({ url })}
              />
            </FieldRow>
          )}
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

const TILE_IMAGE_OPTIONS: { value: DefaultTileImage; label: string }[] = [
  { value: "", label: "Sin imagen de respaldo" },
  { value: "bg_mujer", label: "Mujer" },
  { value: "bg_familia", label: "Familiar" },
  { value: "bg_hombre", label: "Hombre" },
  { value: "bg_hoodie", label: "Unisex (hoodie)" },
  { value: "bg_kids", label: "Kids" },
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
            label="Imagen de respaldo"
            value={tile.defaultImage}
            onChange={(defaultImage) => update({ defaultImage })}
            options={TILE_IMAGE_OPTIONS}
            hint="Se usa mientras no subas una imagen propia."
          />
        </div>
      )}
    />
  )
}

function FeaturedFields({
  section,
  onChange,
}: {
  section: FeaturedSection
  onChange: (s: FeaturedSection) => void
}) {
  const set = (patch: Partial<FeaturedSection>) =>
    onChange({ ...section, ...patch })
  return (
    <>
      <FieldRow>
        <TextField
          label="Título"
          value={section.title}
          onChange={(title) => set({ title })}
          maxLength={80}
        />
        <TextField
          label="Subtítulo"
          value={section.subtitle}
          onChange={(subtitle) => set({ subtitle })}
          maxLength={200}
        />
      </FieldRow>
      <FieldRow>
        <NumberField
          label="Cantidad de productos"
          value={section.limit}
          onChange={(limit) => set({ limit })}
          min={2}
          max={12}
        />
        <SelectField<FeaturedSection["fit"]>
          label="Mostrar solo"
          value={section.fit}
          onChange={(fit) => set({ fit })}
          options={[
            { value: "", label: "Todo el catálogo" },
            { value: "women", label: "Mujer" },
            { value: "family", label: "Familiar" },
            { value: "men", label: "Hombre" },
            { value: "unisex", label: "Unisex" },
            { value: "kids", label: "Kids" },
          ]}
        />
      </FieldRow>
      <FieldRow>
        <TextField
          label="Texto del botón"
          value={section.ctaLabel}
          onChange={(ctaLabel) => set({ ctaLabel })}
          maxLength={40}
          hint="Vacío = sin botón."
        />
        <LinkField
          label="Destino del botón"
          value={section.ctaUrl}
          onChange={(ctaUrl) => set({ ctaUrl })}
        />
      </FieldRow>
    </>
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
      <SelectField<BannerSection["align"]>
        label="Alineación del texto"
        value={section.align}
        onChange={(align) => set({ align })}
        options={[
          { value: "left", label: "Izquierda" },
          { value: "center", label: "Centro" },
          { value: "right", label: "Derecha" },
        ]}
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
      <SelectField<TextSection["align"]>
        label="Alineación"
        value={section.align}
        onChange={(align) => set({ align })}
        options={[
          { value: "left", label: "Izquierda" },
          { value: "center", label: "Centro" },
        ]}
      />
    </>
  )
}

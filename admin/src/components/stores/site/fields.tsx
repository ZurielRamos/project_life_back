import {
  useContext,
  useId,
  useRef,
  type ReactNode,
} from "react"
import {
  GripVertical,
  ImagePlus,
  Loader2,
  Plus,
  Trash2,
  X,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { SortableList } from "@/components/ui/sortable"
import { ColorPicker } from "@/components/ui/color-picker"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

import { BANNER_RULES, useImageUpload } from "../use-image-upload"
import { SiteEditorContext } from "./site-context"

/** Destinos internos fijos que se ofrecen al escribir un enlace. */
const INTERNAL_LINKS: { value: string; label: string }[] = [
  { value: "/", label: "Inicio" },
  { value: "/tienda", label: "Catálogo completo" },
  { value: "/tienda?fit=women", label: "Catálogo: Mujer" },
  { value: "/tienda?fit=family", label: "Catálogo: Familiar" },
  { value: "/tienda?fit=men", label: "Catálogo: Hombre" },
  { value: "/tienda?fit=unisex", label: "Catálogo: Unisex" },
  { value: "/tienda?fit=kids", label: "Catálogo: Kids" },
  { value: "/contacto", label: "Contacto" },
]

// ---------------------------------------------------------------------------
// Estructura
// ---------------------------------------------------------------------------

/** Tarjeta que agrupa campos de una sección del editor. */
export function Card({
  title,
  description,
  children,
  className,
}: {
  title?: string
  description?: string
  children: ReactNode
  className?: string
}) {
  return (
    <section
      className={cn(
        "flex flex-col gap-4 rounded-2xl border bg-white p-6",
        className
      )}
    >
      {(title || description) && (
        <div>
          {title && (
            <h2 className="text-base font-semibold text-neutral-900">
              {title}
            </h2>
          )}
          {description && (
            <p className="text-sm text-neutral-500">{description}</p>
          )}
        </div>
      )}
      {children}
    </section>
  )
}

/** Campo con etiqueta, ayuda opcional y control enlazado por id. */
export function FieldShell({
  label,
  hint,
  htmlFor,
  children,
  className,
  hideLabel,
}: {
  label: string
  hint?: string
  htmlFor?: string
  children: ReactNode
  className?: string
  /** Oculta la etiqueta visualmente (sigue disponible para lectores de pantalla). */
  hideLabel?: boolean
}) {
  return (
    <div className={cn("grid content-start gap-2", className)}>
      <Label htmlFor={htmlFor} className={hideLabel ? "sr-only" : undefined}>
        {label}
      </Label>
      {children}
      {hint && <p className="text-xs text-neutral-500">{hint}</p>}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Campos simples
// ---------------------------------------------------------------------------

export function TextField({
  label,
  value,
  onChange,
  placeholder,
  maxLength,
  hint,
  className,
  hideLabel,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  maxLength?: number
  hint?: string
  className?: string
  hideLabel?: boolean
}) {
  const id = useId()
  const { readOnly } = useContext(SiteEditorContext)
  return (
    <FieldShell
      label={label}
      hint={hint}
      htmlFor={id}
      className={className}
      hideLabel={hideLabel}
    >
      <Input
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        maxLength={maxLength}
        disabled={readOnly}
      />
    </FieldShell>
  )
}

export function TextAreaField({
  label,
  value,
  onChange,
  placeholder,
  maxLength,
  hint,
  rows = 4,
  className,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  maxLength?: number
  hint?: string
  rows?: number
  className?: string
}) {
  const id = useId()
  const { readOnly } = useContext(SiteEditorContext)
  return (
    <FieldShell label={label} hint={hint} htmlFor={id} className={className}>
      <textarea
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        maxLength={maxLength}
        rows={rows}
        disabled={readOnly}
        className="border-input focus-visible:border-ring focus-visible:ring-ring/50 w-full rounded-md border bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:ring-[3px] disabled:opacity-50"
      />
      {maxLength && (
        <p className="text-right text-xs text-neutral-400">
          {value.length}/{maxLength}
        </p>
      )}
    </FieldShell>
  )
}

/** Valor interno para la opción vacía (Radix no admite value=""). */
const EMPTY_VALUE = "__empty__"

export interface SelectOption<T extends string> {
  value: T
  label: string
  /** Explicación breve que se muestra debajo de la opción. */
  description?: string
}

/**
 * Selector desplegable (no nativo) con soporte de descripción por opción.
 * Accesible con teclado y lector de pantalla (Radix Select).
 */
export function SelectField<T extends string>({
  label,
  value,
  onChange,
  options,
  hint,
  className,
  placeholder = "Elegir…",
}: {
  label: string
  value: T
  onChange: (value: T) => void
  options: SelectOption<T>[]
  hint?: string
  className?: string
  placeholder?: string
}) {
  const id = useId()
  const { readOnly } = useContext(SiteEditorContext)
  const toInner = (v: string) => (v === "" ? EMPTY_VALUE : v)
  const current = options.find((o) => o.value === value)
  return (
    <FieldShell label={label} hint={hint} htmlFor={id} className={className}>
      <Select
        value={toInner(value)}
        onValueChange={(v) => onChange((v === EMPTY_VALUE ? "" : v) as T)}
        disabled={readOnly}
      >
        <SelectTrigger id={id} className="w-full bg-white">
          <SelectValue placeholder={placeholder}>{current?.label}</SelectValue>
        </SelectTrigger>
        <SelectContent className="max-w-[min(28rem,var(--radix-select-trigger-width)+12rem)]">
          {options.map((o) => (
            <SelectItem
              key={o.value || EMPTY_VALUE}
              value={toInner(o.value)}
              className="items-start py-2"
            >
              <span className="flex flex-col gap-0.5">
                <span>{o.label}</span>
                {o.description && (
                  <span className="text-xs leading-snug text-neutral-500">
                    {o.description}
                  </span>
                )}
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </FieldShell>
  )
}

export function NumberField({
  label,
  value,
  onChange,
  min,
  max,
  hint,
  className,
}: {
  label: string
  value: number
  onChange: (value: number) => void
  min: number
  max: number
  hint?: string
  className?: string
}) {
  const id = useId()
  const { readOnly } = useContext(SiteEditorContext)
  return (
    <FieldShell label={label} hint={hint} htmlFor={id} className={className}>
      <Input
        id={id}
        type="number"
        min={min}
        max={max}
        value={value}
        onChange={(e) => {
          const n = Number(e.target.value)
          if (Number.isFinite(n)) onChange(Math.min(max, Math.max(min, n)))
        }}
        disabled={readOnly}
      />
    </FieldShell>
  )
}

/** Interruptor accesible (role="switch") con etiqueta y descripción. */
export function SwitchField({
  label,
  description,
  checked,
  onChange,
}: {
  label: string
  description?: string
  checked: boolean
  onChange: (checked: boolean) => void
}) {
  const { readOnly } = useContext(SiteEditorContext)
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <p className="text-sm font-medium text-neutral-900">{label}</p>
        {description && (
          <p className="text-xs text-neutral-500">{description}</p>
        )}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={readOnly}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative mt-0.5 inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:opacity-50",
          checked ? "bg-neutral-900" : "bg-neutral-300"
        )}
      >
        <span
          className={cn(
            "inline-block size-5 rounded-full bg-white shadow transition-transform",
            checked ? "translate-x-5" : "translate-x-0.5"
          )}
        />
      </button>
    </div>
  )
}

export function ColorField({
  label,
  value,
  onChange,
  hint,
  contrastWith,
  contrastLabel,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  hint?: string
  /** Color contra el que se mide el contraste (p. ej. el del texto). */
  contrastWith?: string
  contrastLabel?: string
}) {
  const id = useId()
  const { readOnly } = useContext(SiteEditorContext)
  return (
    <FieldShell label={label} hint={hint} htmlFor={id}>
      <ColorPicker
        id={id}
        label={label}
        value={value}
        onChange={onChange}
        disabled={readOnly}
        contrastWith={contrastWith}
        contrastLabel={contrastLabel}
      />
    </FieldShell>
  )
}

// ---------------------------------------------------------------------------
// Enlaces e imágenes
// ---------------------------------------------------------------------------

/** Campo de enlace con sugerencias de rutas internas y páginas creadas. */
export function LinkField({
  label,
  value,
  onChange,
  hint,
  className,
  hideLabel,
  placeholder = "/tienda o https://…",
}: {
  label: string
  value: string
  onChange: (value: string) => void
  hint?: string
  className?: string
  hideLabel?: boolean
  placeholder?: string
}) {
  const id = useId()
  const listId = `${id}-links`
  const { readOnly, pageSlugs } = useContext(SiteEditorContext)
  return (
    <FieldShell
      label={label}
      hint={hint}
      htmlFor={id}
      className={className}
      hideLabel={hideLabel}
    >
      <Input
        id={id}
        list={listId}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        maxLength={2048}
        disabled={readOnly}
        autoComplete="off"
      />
      <datalist id={listId}>
        {INTERNAL_LINKS.map((l) => (
          <option key={l.value} value={l.value}>
            {l.label}
          </option>
        ))}
        {pageSlugs.map((p) => (
          <option key={p.slug} value={`/p/${p.slug}`}>
            {p.title}
          </option>
        ))}
      </datalist>
    </FieldShell>
  )
}

/** Imagen con vista previa, subida a Cloudinary o URL manual. */
export function ImageField({
  label,
  value,
  onChange,
  hint,
  emptyLabel = "Sin imagen",
  className,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  hint?: string
  /** Texto cuando no hay imagen (p. ej. "Usa la imagen por defecto"). */
  emptyLabel?: string
  className?: string
}) {
  const id = useId()
  const { storeId, readOnly } = useContext(SiteEditorContext)
  const inputRef = useRef<HTMLInputElement>(null)
  const { upload, uploading, error } = useImageUpload(storeId)

  async function handleFile(file: File | undefined) {
    if (!file) return
    const url = await upload(file, BANNER_RULES)
    if (url) onChange(url)
    if (inputRef.current) inputRef.current.value = ""
  }

  return (
    <FieldShell label={label} hint={hint} htmlFor={id} className={className}>
      <div className="flex items-start gap-3">
        <div className="flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-xl border bg-neutral-50">
          {value ? (
            <img
              src={value}
              alt=""
              className="size-full object-contain"
              loading="lazy"
            />
          ) : (
            <span className="px-1 text-center text-[10px] leading-tight text-neutral-400">
              {emptyLabel}
            </span>
          )}
        </div>
        <div className="grid min-w-0 flex-1 gap-2">
          <Input
            id={id}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="https://…"
            maxLength={2048}
            disabled={readOnly}
          />
          <div className="relative flex flex-wrap items-center gap-2">
            <input
              ref={inputRef}
              type="file"
              accept={BANNER_RULES.mimes.join(",")}
              className="sr-only"
              aria-label={`Subir imagen: ${label}`}
              onChange={(e) => void handleFile(e.target.files?.[0])}
              tabIndex={-1}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={readOnly || uploading}
              onClick={() => inputRef.current?.click()}
            >
              {uploading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <ImagePlus className="size-4" />
              )}
              {uploading ? "Subiendo…" : "Subir imagen"}
            </Button>
            {value && !readOnly && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => onChange("")}
              >
                <X className="size-4" />
                Quitar
              </Button>
            )}
          </div>
          {error && (
            <p role="alert" className="text-destructive text-xs">
              {error}
            </p>
          )}
        </div>
      </div>
    </FieldShell>
  )
}

// ---------------------------------------------------------------------------
// Listas
// ---------------------------------------------------------------------------

/** Botón para eliminar un elemento de una lista. */
export function RemoveItemButton({
  label,
  onRemove,
}: {
  /** Qué se elimina, para lectores de pantalla ("enlace 2"). */
  label: string
  onRemove: () => void
}) {
  const { readOnly } = useContext(SiteEditorContext)
  if (readOnly) return null
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="text-destructive hover:text-destructive size-8 shrink-0"
      aria-label={`Eliminar ${label}`}
      title="Eliminar"
      onClick={onRemove}
    >
      <Trash2 className="size-4" />
    </Button>
  )
}

/** Indicación de cómo ordenar una lista (se muestra si hay 2 o más elementos). */
export function ReorderHint({ count }: { count: number }) {
  const { readOnly } = useContext(SiteEditorContext)
  if (readOnly || count < 2) return null
  return (
    <p className="flex items-center gap-1.5 text-xs text-neutral-500">
      <GripVertical className="size-3.5 shrink-0" aria-hidden="true" />
      Arrastra desde <span className="font-medium text-neutral-700">⋮⋮</span>{" "}
      para cambiar el orden (o enfócalo y usa ↑ ↓).
    </p>
  )
}

/** Botón «Agregar» con el aviso de máximo. */
function AddItem({
  label,
  count,
  max,
  onAdd,
}: {
  label: string
  count: number
  max: number
  onAdd: () => void
}) {
  const { readOnly } = useContext(SiteEditorContext)
  if (readOnly) return null
  return (
    <div className="flex items-center gap-3">
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={count >= max}
        onClick={onAdd}
      >
        <Plus className="size-4" />
        {label}
      </Button>
      <span className="text-xs text-neutral-500">
        {count >= max ? `Llegaste al máximo de ${max}.` : `${count} de ${max}`}
      </span>
    </div>
  )
}

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

/**
 * Lista editable de elementos con varios campos (columnas, preguntas,
 * páginas…). Cada elemento es una tarjeta con su título y acciones en la
 * barra superior; se reordena arrastrando desde el asa.
 * Para listas de enlaces usa LinkList, que es más compacta.
 */
export function RepeatableList<T>({
  items,
  onChange,
  renderItem,
  createItem,
  max,
  addLabel,
  emptyLabel,
  itemLabel,
  itemTitle,
}: {
  items: T[]
  onChange: (items: T[]) => void
  renderItem: (
    item: T,
    update: (patch: Partial<T>) => void,
    index: number
  ) => ReactNode
  createItem: () => T
  max: number
  addLabel: string
  emptyLabel?: string
  /** Nombre de cada elemento (p. ej. "pregunta"). */
  itemLabel: string
  /** Título visible de cada elemento; por defecto «Pregunta 1», «Pregunta 2»… */
  itemTitle?: (item: T, index: number) => string
}) {
  const { readOnly } = useContext(SiteEditorContext)
  const update = (index: number, patch: Partial<T>) =>
    onChange(items.map((it, i) => (i === index ? { ...it, ...patch } : it)))
  const titleOf = (item: T, index: number) =>
    itemTitle?.(item, index) || `${capitalize(itemLabel)} ${index + 1}`

  return (
    <div className="flex flex-col gap-3">
      {items.length === 0 && emptyLabel && (
        <p className="rounded-xl border border-dashed p-4 text-center text-sm text-neutral-500">
          {emptyLabel}
        </p>
      )}
      <ReorderHint count={items.length} />
      <SortableList
        items={items}
        onReorder={onChange}
        itemLabel={itemLabel}
        getItemName={titleOf}
        disabled={readOnly}
        className="flex flex-col gap-3"
        renderItem={(item, { handle, index }) => (
          <div className="rounded-xl border bg-white">
            <div className="flex items-center gap-1 border-b bg-neutral-50 py-1 pr-1 pl-1">
              {handle}
              <span className="min-w-0 flex-1 truncate pl-1 text-xs font-semibold tracking-wide text-neutral-500 uppercase">
                {titleOf(item, index)}
              </span>
              <RemoveItemButton
                label={titleOf(item, index)}
                onRemove={() => onChange(items.filter((_, i) => i !== index))}
              />
            </div>
            <div className="p-3">
              {renderItem(item, (patch) => update(index, patch), index)}
            </div>
          </div>
        )}
      />
      <AddItem
        label={addLabel}
        count={items.length}
        max={max}
        onAdd={() => onChange([...items, createItem()])}
      />
    </div>
  )
}

/**
 * Lista compacta de enlaces (texto + destino): una tabla con el encabezado
 * escrito una sola vez; cada fila se arrastra desde el asa.
 */
export function LinkList({
  items,
  onChange,
  max,
  addLabel,
  emptyLabel,
  itemLabel,
  textLabel = "Texto",
  textPlaceholder,
  urlLabel = "Destino",
  newItem = { label: "", url: "" },
}: {
  items: { label: string; url: string }[]
  onChange: (items: { label: string; url: string }[]) => void
  max: number
  addLabel: string
  emptyLabel?: string
  /** Nombre de cada fila (p. ej. "enlace"). */
  itemLabel: string
  textLabel?: string
  textPlaceholder?: string
  urlLabel?: string
  /** Valores de una fila nueva. */
  newItem?: { label: string; url: string }
}) {
  const { readOnly } = useContext(SiteEditorContext)
  const update = (
    index: number,
    patch: Partial<{ label: string; url: string }>
  ) => onChange(items.map((it, i) => (i === index ? { ...it, ...patch } : it)))
  // Mismas columnas en el encabezado y en las filas.
  const cols = cn(
    "grid gap-2 sm:items-center",
    readOnly
      ? "sm:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]"
      : "grid-cols-[32px_minmax(0,1fr)_32px] sm:grid-cols-[32px_minmax(0,1fr)_minmax(0,1.4fr)_32px]"
  )

  return (
    <div className="flex flex-col gap-3">
      {items.length === 0 ? (
        emptyLabel && (
          <p className="rounded-xl border border-dashed p-4 text-center text-sm text-neutral-500">
            {emptyLabel}
          </p>
        )
      ) : (
        <div className="overflow-hidden rounded-xl border bg-white">
          <div
            className={cn(
              cols,
              "hidden border-b bg-neutral-50 px-2 py-2 text-xs font-semibold tracking-wide text-neutral-500 uppercase sm:grid"
            )}
          >
            {!readOnly && <span className="sr-only">Orden</span>}
            <span>{textLabel}</span>
            <span>{urlLabel}</span>
            {!readOnly && <span className="sr-only">Acciones</span>}
          </div>
          <SortableList
            items={items}
            onReorder={onChange}
            itemLabel={itemLabel}
            getItemName={(item, i) => item.label || `${itemLabel} ${i + 1}`}
            disabled={readOnly}
            className="divide-y"
            renderItem={(item, { handle, index }) => (
              <div className={cn(cols, "bg-white px-2 py-2 [&>*]:min-w-0")}>
                {handle}
                <TextField
                  label={`${textLabel} del ${itemLabel} ${index + 1}`}
                  hideLabel
                  value={item.label}
                  onChange={(label) => update(index, { label })}
                  placeholder={textPlaceholder ?? textLabel}
                  maxLength={60}
                />
                <LinkField
                  label={`${urlLabel} del ${itemLabel} ${index + 1}`}
                  hideLabel
                  value={item.url}
                  onChange={(url) => update(index, { url })}
                  placeholder={urlLabel}
                  className="col-span-3 col-start-1 row-start-2 sm:col-span-1 sm:col-start-auto sm:row-start-auto"
                />
                <RemoveItemButton
                  label={item.label || `${itemLabel} ${index + 1}`}
                  onRemove={() => onChange(items.filter((_, i) => i !== index))}
                />
              </div>
            )}
          />
        </div>
      )}
      <ReorderHint count={items.length} />
      <AddItem
        label={addLabel}
        count={items.length}
        max={max}
        onAdd={() => onChange([...items, { ...newItem }])}
      />
    </div>
  )
}

/** Fila de campos en cuadrícula responsive. */
export function FieldRow({
  children,
  cols = 2,
}: {
  children: ReactNode
  cols?: 2 | 3
}) {
  return (
    <div
      className={cn(
        "grid gap-4",
        cols === 2 ? "sm:grid-cols-2" : "sm:grid-cols-3"
      )}
    >
      {children}
    </div>
  )
}

/** Grupo de opciones excluyentes con radios nativos (teclado y lector OK). */
export function Segmented<T extends string>({
  label,
  value,
  onChange,
  options,
  hint,
}: {
  label: string
  value: T
  onChange: (value: T) => void
  options: { value: T; label: string }[]
  hint?: string
}) {
  const name = useId()
  const { readOnly } = useContext(SiteEditorContext)
  return (
    <fieldset className="grid gap-2" disabled={readOnly}>
      <legend className="mb-2 text-sm font-medium text-neutral-900">
        {label}
      </legend>
      <div className="flex w-full flex-wrap gap-1 rounded-xl bg-neutral-100 p-1 sm:w-fit">
        {options.map((o) => (
          <label
            key={o.value}
            className={cn(
              "relative flex-1 cursor-pointer rounded-lg px-3 py-1.5 text-center text-sm font-medium whitespace-nowrap text-neutral-600 transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-neutral-400 sm:flex-none",
              value === o.value
                ? "bg-white text-neutral-900 shadow-sm"
                : "hover:text-neutral-900"
            )}
          >
            <input
              type="radio"
              name={name}
              value={o.value}
              checked={value === o.value}
              onChange={() => onChange(o.value)}
              className="sr-only"
            />
            {o.label}
          </label>
        ))}
      </div>
      {hint && <p className="text-xs text-neutral-500">{hint}</p>}
    </fieldset>
  )
}

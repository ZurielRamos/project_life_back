import {
  useContext,
  useId,
  useRef,
  useState,
  type ReactNode,
} from "react"
import {
  ArrowDown,
  ArrowUp,
  ImagePlus,
  Loader2,
  Plus,
  Trash2,
  X,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { ApiError } from "@/lib/api"
import { uploadStoreAsset } from "@/lib/stores-api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

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
}: {
  label: string
  hint?: string
  htmlFor?: string
  children: ReactNode
  className?: string
}) {
  return (
    <div className={cn("grid gap-2", className)}>
      <Label htmlFor={htmlFor}>{label}</Label>
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
}: {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  maxLength?: number
  hint?: string
  className?: string
}) {
  const id = useId()
  const { readOnly } = useContext(SiteEditorContext)
  return (
    <FieldShell label={label} hint={hint} htmlFor={id} className={className}>
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

export function SelectField<T extends string>({
  label,
  value,
  onChange,
  options,
  hint,
  className,
}: {
  label: string
  value: T
  onChange: (value: T) => void
  options: { value: T; label: string }[]
  hint?: string
  className?: string
}) {
  const id = useId()
  const { readOnly } = useContext(SiteEditorContext)
  return (
    <FieldShell label={label} hint={hint} htmlFor={id} className={className}>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        disabled={readOnly}
        className="border-input focus-visible:border-ring focus-visible:ring-ring/50 h-9 w-full rounded-md border bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:ring-[3px] disabled:opacity-50"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
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
}: {
  label: string
  value: string
  onChange: (value: string) => void
  hint?: string
}) {
  const id = useId()
  const { readOnly } = useContext(SiteEditorContext)
  const valid = /^#[0-9a-fA-F]{6}$/.test(value)
  return (
    <FieldShell label={label} hint={hint} htmlFor={id}>
      <div className="flex items-center gap-2">
        <input
          type="color"
          aria-label={`Elegir color: ${label}`}
          value={valid ? value : "#000000"}
          onChange={(e) => onChange(e.target.value)}
          disabled={readOnly}
          className="size-9 shrink-0 cursor-pointer rounded-md border bg-transparent p-1 disabled:opacity-50"
        />
        <Input
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          maxLength={7}
          placeholder="#000000"
          disabled={readOnly}
        />
      </div>
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
}: {
  label: string
  value: string
  onChange: (value: string) => void
  hint?: string
  className?: string
}) {
  const id = useId()
  const listId = `${id}-links`
  const { readOnly, pageSlugs } = useContext(SiteEditorContext)
  return (
    <FieldShell label={label} hint={hint} htmlFor={id} className={className}>
      <Input
        id={id}
        list={listId}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="/tienda o https://…"
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

const MAX_IMAGE_BYTES = 8 * 1024 * 1024
const ACCEPTED = "image/png,image/jpeg,image/webp,image/gif,image/avif"

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
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleFile(file: File | undefined) {
    if (!file) return
    setError(null)
    if (!ACCEPTED.split(",").includes(file.type)) {
      setError("Formato no admitido. Usa PNG, JPG, WEBP, GIF o AVIF.")
      return
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setError("La imagen supera los 8 MB.")
      return
    }
    setUploading(true)
    try {
      const dataUri = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(String(reader.result))
        reader.onerror = () => reject(new Error("No se pudo leer el archivo"))
        reader.readAsDataURL(file)
      })
      const uploaded = await uploadStoreAsset(storeId, dataUri)
      onChange(uploaded.url)
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "No se pudo subir la imagen."
      )
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ""
    }
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
          <div className="flex flex-wrap items-center gap-2">
            <input
              ref={inputRef}
              type="file"
              accept={ACCEPTED}
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

/**
 * Lista editable con alta, baja y reordenamiento. `renderItem` pinta los
 * campos de cada elemento y recibe `update` para modificarlo.
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
}: {
  items: T[]
  onChange: (items: T[]) => void
  renderItem: (item: T, update: (patch: Partial<T>) => void, index: number) => ReactNode
  createItem: () => T
  max: number
  addLabel: string
  emptyLabel?: string
  /** Nombre accesible de cada elemento (p. ej. "enlace"). */
  itemLabel: string
}) {
  const { readOnly } = useContext(SiteEditorContext)

  function update(index: number, patch: Partial<T>) {
    onChange(items.map((it, i) => (i === index ? { ...it, ...patch } : it)))
  }
  function remove(index: number) {
    onChange(items.filter((_, i) => i !== index))
  }
  function move(index: number, delta: -1 | 1) {
    const target = index + delta
    if (target < 0 || target >= items.length) return
    const next = [...items]
    ;[next[index], next[target]] = [next[target], next[index]]
    onChange(next)
  }

  return (
    <div className="flex flex-col gap-3">
      {items.length === 0 && emptyLabel && (
        <p className="rounded-xl border border-dashed p-4 text-center text-sm text-neutral-500">
          {emptyLabel}
        </p>
      )}
      {items.map((item, index) => (
        <div
          key={index}
          className="flex items-start gap-2 rounded-xl border bg-neutral-50/60 p-3"
        >
          <div className="min-w-0 flex-1">
            {renderItem(item, (patch) => update(index, patch), index)}
          </div>
          {!readOnly && (
            <div className="flex shrink-0 flex-col gap-1">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-8"
                aria-label={`Subir ${itemLabel} ${index + 1}`}
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
                aria-label={`Bajar ${itemLabel} ${index + 1}`}
                disabled={index === items.length - 1}
                onClick={() => move(index, 1)}
              >
                <ArrowDown className="size-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="text-destructive hover:text-destructive size-8"
                aria-label={`Eliminar ${itemLabel} ${index + 1}`}
                onClick={() => remove(index)}
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          )}
        </div>
      ))}
      {!readOnly && (
        <div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={items.length >= max}
            onClick={() => onChange([...items, createItem()])}
          >
            <Plus className="size-4" />
            {addLabel}
          </Button>
          {items.length >= max && (
            <span className="ml-3 text-xs text-neutral-500">
              Máximo {max}
            </span>
          )}
        </div>
      )}
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

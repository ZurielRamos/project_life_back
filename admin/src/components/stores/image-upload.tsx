import { useId, useRef, useState } from "react"
import { ImagePlus, Loader2, Trash2, UploadCloud } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"

import { useImageUpload, type UploadRules } from "./use-image-upload"

interface ImageUploadProps {
  storeId: string
  label: string
  value: string
  onChange: (url: string) => void
  rules: UploadRules
  hint?: string
  readOnly?: boolean
  /** Tamaños (px) en los que se muestra la imagen, p. ej. [32, 16] del favicon. */
  previewSizes?: number[]
  className?: string
}

/** Fondo de cuadros para distinguir las zonas transparentes de la imagen. */
const CHECKER =
  "conic-gradient(#ececec 25%, #fff 0 50%, #ececec 0 75%, #fff 0) 0 0 / 12px 12px"

/**
 * Subida de un archivo de imagen (logo, favicon…) con arrastrar y soltar,
 * vista previa sobre fondo de cuadros y validación de formato y tamaño.
 */
export function ImageUpload({
  storeId,
  label,
  value,
  onChange,
  rules,
  hint,
  readOnly,
  previewSizes,
  className,
}: ImageUploadProps) {
  const id = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const { upload, uploading, error } = useImageUpload(storeId)

  async function handleFile(file: File | undefined) {
    if (!file || readOnly) return
    const url = await upload(file, rules)
    if (url) onChange(url)
    if (inputRef.current) inputRef.current.value = ""
  }

  return (
    <div className={cn("relative grid gap-2", className)}>
      <Label htmlFor={id}>{label}</Label>

      <input
        ref={inputRef}
        id={id}
        type="file"
        accept={rules.mimes.join(",")}
        className="sr-only"
        disabled={readOnly || uploading}
        onChange={(e) => void handleFile(e.target.files?.[0])}
      />

      <div
        onDragOver={(e) => {
          if (readOnly) return
          e.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragging(false)
          void handleFile(e.dataTransfer.files?.[0])
        }}
        className={cn(
          "flex items-center gap-4 rounded-xl border border-dashed p-3 transition-colors",
          dragging
            ? "border-neutral-900 bg-neutral-50"
            : "border-neutral-300 hover:border-neutral-400"
        )}
      >
        <div
          className="flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-lg border"
          style={{ background: CHECKER }}
        >
          {value ? (
            <img
              src={value}
              alt={`Vista previa: ${label}`}
              className="size-full object-contain p-1"
            />
          ) : (
            <ImagePlus className="size-6 text-neutral-400" aria-hidden="true" />
          )}
        </div>

        <div className="grid min-w-0 flex-1 gap-2">
          <div className="flex flex-wrap items-center gap-2">
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
                <UploadCloud className="size-4" />
              )}
              {uploading ? "Subiendo…" : value ? "Reemplazar" : "Subir archivo"}
            </Button>
            {value && !readOnly && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-neutral-600"
                onClick={() => onChange("")}
              >
                <Trash2 className="size-4" />
                Quitar
              </Button>
            )}
          </div>
          <p className="text-xs text-neutral-500">
            {readOnly ? rules.formats : `Arrastra un archivo aquí. ${rules.formats}`}
          </p>
          {value && previewSizes && previewSizes.length > 0 && (
            <div className="flex items-end gap-3" aria-hidden="true">
              {previewSizes.map((size) => (
                <img
                  key={size}
                  src={value}
                  alt=""
                  width={size}
                  height={size}
                  style={{ width: size, height: size }}
                  className="rounded-sm object-contain"
                />
              ))}
              <span className="text-[11px] text-neutral-400">
                {previewSizes.join(" y ")} px
              </span>
            </div>
          )}
        </div>
      </div>

      {error && (
        <p role="alert" className="text-destructive text-xs">
          {error}
        </p>
      )}
      {hint && !error && <p className="text-xs text-neutral-500">{hint}</p>}
    </div>
  )
}

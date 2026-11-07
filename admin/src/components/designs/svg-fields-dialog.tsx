import { useEffect, useRef, useState } from "react"
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Loader2,
  Sparkles,
  Upload,
} from "lucide-react"

import type { SvgTextField, TextAlign } from "@/lib/svg-template"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface SvgFieldsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Campos de texto detectados en el SVG (con su texto por defecto). */
  fields: SvgTextField[]
  /** Valores actuales por id de campo (precargados con el texto del SVG). */
  values: Record<string, string>
  onValuesChange: (values: Record<string, string>) => void
  /** Alineación por id de campo. */
  aligns: Record<string, TextAlign>
  onAlignsChange: (aligns: Record<string, TextAlign>) => void
  /** Familias tipográficas del SVG que aún no están registradas. */
  missingFonts: string[]
  /** Sube el archivo de una fuente faltante para la familia indicada. */
  onUploadFont: (family: string, file: File) => Promise<void>
  /** Aplica el diseño (rasteriza y coloca). Solo si no faltan fuentes. */
  onApply: () => void
  applying: boolean
}

/**
 * Modal para gestionar una plantilla SVG: edita el texto de cada campo
 * (`<text id>`, precargado) y obliga a registrar las fuentes faltantes antes
 * de aplicar. No se puede aplicar mientras falte alguna fuente.
 */
export function SvgFieldsDialog({
  open,
  onOpenChange,
  fields,
  values,
  onValuesChange,
  aligns,
  onAlignsChange,
  missingFonts,
  onUploadFont,
  onApply,
  applying,
}: SvgFieldsDialogProps) {
  const fontInputRef = useRef<HTMLInputElement>(null)
  const pendingFamilyRef = useRef<string | null>(null)
  const [uploadingFamily, setUploadingFamily] = useState<string | null>(null)

  // Al cerrarse, limpia el estado de subida en curso.
  useEffect(() => {
    if (!open) setUploadingFamily(null)
  }, [open])

  function pickFont(family: string) {
    pendingFamilyRef.current = family
    fontInputRef.current?.click()
  }

  async function handleFontFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ""
    const family = pendingFamilyRef.current
    if (!file || !family) return
    setUploadingFamily(family)
    try {
      await onUploadFont(family, file)
    } finally {
      setUploadingFamily(null)
    }
  }

  const hasMissingFonts = missingFonts.length > 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Texto del diseño</DialogTitle>
          <DialogDescription>
            Edita el texto de cada campo de la plantilla. El diseño se generará
            con estos valores.
          </DialogDescription>
        </DialogHeader>

        <input
          ref={fontInputRef}
          type="file"
          accept=".ttf,.otf,.woff,.woff2,font/*"
          className="hidden"
          onChange={handleFontFile}
        />

        {hasMissingFonts && (
          <div className="border-destructive/40 bg-destructive/10 flex flex-col gap-2 rounded-md border px-3 py-2">
            <p className="text-destructive text-xs font-medium">
              Faltan fuentes por registrar. Súbelas para poder generar el
              diseño con la tipografía correcta.
            </p>
            <div className="flex flex-wrap gap-2">
              {missingFonts.map((fam) => (
                <Button
                  key={fam}
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7"
                  disabled={uploadingFamily === fam}
                  onClick={() => pickFont(fam)}
                >
                  {uploadingFamily === fam ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <Upload className="size-3.5" />
                  )}
                  Subir "{fam}"
                </Button>
              ))}
            </div>
          </div>
        )}

        <div className="flex max-h-[50vh] flex-col gap-3 overflow-y-auto">
          {fields.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              Esta plantilla no tiene campos de texto editables.
            </p>
          ) : (
            fields.map((field) => {
              const align = aligns[field.id] ?? "center"
              const alignOptions: {
                value: TextAlign
                icon: typeof AlignLeft
                label: string
              }[] = [
                { value: "left", icon: AlignLeft, label: "Izquierda" },
                { value: "center", icon: AlignCenter, label: "Centro" },
                { value: "right", icon: AlignRight, label: "Derecha" },
              ]
              return (
                <div key={field.id} className="grid gap-1.5">
                  <Label htmlFor={`svg-field-${field.id}`} className="text-xs">
                    {field.label}
                  </Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id={`svg-field-${field.id}`}
                      value={values[field.id] ?? ""}
                      placeholder={field.defaultText}
                      onChange={(e) =>
                        onValuesChange({
                          ...values,
                          [field.id]: e.target.value,
                        })
                      }
                    />
                    <div className="flex shrink-0 items-center rounded-md border">
                      {alignOptions.map((opt) => {
                        const Icon = opt.icon
                        const active = align === opt.value
                        return (
                          <button
                            key={opt.value}
                            type="button"
                            title={opt.label}
                            aria-label={`Alinear ${opt.label}`}
                            aria-pressed={active}
                            className={
                              "flex size-8 items-center justify-center first:rounded-l-md last:rounded-r-md " +
                              (active
                                ? "bg-neutral-900 text-white"
                                : "text-neutral-500 hover:bg-neutral-100")
                            }
                            onClick={() =>
                              onAlignsChange({
                                ...aligns,
                                [field.id]: opt.value,
                              })
                            }
                          >
                            <Icon className="size-4" />
                          </button>
                        )
                      })}
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={applying}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={onApply}
            disabled={applying || hasMissingFonts}
            title={
              hasMissingFonts
                ? "Registra las fuentes faltantes para continuar"
                : undefined
            }
          >
            {applying ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Sparkles className="size-4" />
            )}
            Aplicar diseño
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

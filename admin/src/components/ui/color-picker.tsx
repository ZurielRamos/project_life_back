import { useId, useState } from "react"
import { HexColorInput, HexColorPicker } from "react-colorful"
import { Check, ChevronDown, X } from "lucide-react"

import { cn } from "@/lib/utils"
import {
  contrastLevel,
  contrastRatio,
  isHexColor,
} from "@/lib/color"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

/** Colores sugeridos: paleta amplia y neutra para marcas de ropa. */
const PRESETS = [
  "#00B3A6",
  "#01B7BB",
  "#2563EB",
  "#4F46E5",
  "#7C3AED",
  "#DB2777",
  "#E11D48",
  "#EA580C",
  "#F59E0B",
  "#16A34A",
  "#0F172A",
  "#FFFFFF",
]

const LEVEL_TEXT: Record<
  ReturnType<typeof contrastLevel>,
  { label: string; className: string }
> = {
  AAA: { label: "AAA · excelente", className: "text-emerald-600" },
  AA: { label: "AA · buena lectura", className: "text-emerald-600" },
  "AA-large": {
    label: "Solo apto para texto grande",
    className: "text-amber-600",
  },
  low: { label: "Contraste insuficiente", className: "text-red-600" },
}

interface ColorPickerProps {
  value: string
  onChange: (value: string) => void
  /** Nombre del color, para lectores de pantalla ("Color de marca"). */
  label: string
  id?: string
  disabled?: boolean
  /** Permite dejar el color sin definir (value = ""). */
  allowEmpty?: boolean
  placeholder?: string
  /**
   * Color contra el que se mide el contraste (p. ej. el del texto que se
   * dibuja encima). Se muestra la relación WCAG dentro del selector.
   */
  contrastWith?: string
  /** Descripción del color de contraste ("texto blanco"). */
  contrastLabel?: string
  className?: string
}

/**
 * Selector de color con área de saturación, tono, campo hexadecimal,
 * colores sugeridos y medición de contraste. Se abre en un popover.
 */
export function ColorPicker({
  value,
  onChange,
  label,
  id,
  disabled,
  allowEmpty,
  placeholder = "Elegir color",
  contrastWith,
  contrastLabel = "el texto",
  className,
}: ColorPickerProps) {
  const autoId = useId()
  const [open, setOpen] = useState(false)
  const valid = isHexColor(value)
  // El selector necesita un color de partida aunque no haya valor.
  const shown = valid ? value : "#00B3A6"

  const ratio =
    valid && contrastWith && isHexColor(contrastWith)
      ? contrastRatio(value, contrastWith)
      : null
  const level = ratio !== null ? contrastLevel(ratio) : null

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          id={id ?? autoId}
          disabled={disabled}
          aria-label={`${label}: ${valid ? value : "sin color"}. Cambiar color`}
          className={cn(
            "border-input hover:border-ring/60 focus-visible:border-ring focus-visible:ring-ring/50 flex h-9 w-full items-center gap-2.5 rounded-md border bg-transparent px-2 text-left text-sm shadow-xs transition-colors outline-none focus-visible:ring-[3px] disabled:pointer-events-none disabled:opacity-50",
            className
          )}
        >
          <span
            aria-hidden="true"
            className={cn(
              "size-5 shrink-0 rounded-md border border-black/10 shadow-inner",
              !valid && "bg-[length:8px_8px]"
            )}
            style={
              valid
                ? { backgroundColor: value }
                : {
                    backgroundImage:
                      "conic-gradient(#e5e5e5 25%, #fff 0 50%, #e5e5e5 0 75%, #fff 0)",
                  }
            }
          />
          <span
            className={cn(
              "min-w-0 flex-1 truncate font-mono text-[13px] uppercase",
              !valid && "font-sans text-neutral-400 normal-case"
            )}
          >
            {valid ? value : placeholder}
          </span>
          <ChevronDown className="size-4 shrink-0 text-neutral-400" />
        </button>
      </PopoverTrigger>

      <PopoverContent className="color-picker w-64">
        <div className="flex flex-col gap-3">
          <HexColorPicker
            color={shown}
            onChange={(c) => onChange(c.toUpperCase())}
          />

          <div className="flex items-center gap-2">
            <span
              aria-hidden="true"
              className="size-8 shrink-0 rounded-lg border border-black/10"
              style={{ backgroundColor: shown }}
            />
            <div className="relative min-w-0 flex-1">
              <span className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 font-mono text-sm text-neutral-400">
                #
              </span>
              <HexColorInput
                color={shown}
                onChange={(c) => onChange(c.toUpperCase())}
                aria-label={`Código hexadecimal de ${label}`}
                className="border-input focus-visible:border-ring focus-visible:ring-ring/50 h-8 w-full rounded-md border bg-transparent pr-2 pl-6 font-mono text-sm uppercase outline-none focus-visible:ring-[3px]"
              />
            </div>
          </div>

          <div
            role="group"
            aria-label="Colores sugeridos"
            className="grid grid-cols-6 gap-1.5"
          >
            {PRESETS.map((preset) => {
              const selected = valid && preset.toLowerCase() === value.toLowerCase()
              return (
                <button
                  key={preset}
                  type="button"
                  onClick={() => onChange(preset)}
                  aria-label={`Usar ${preset}`}
                  aria-pressed={selected}
                  className={cn(
                    "focus-visible:ring-ring/60 relative flex aspect-square items-center justify-center rounded-lg border border-black/10 transition-transform outline-none hover:scale-110 focus-visible:ring-[3px]",
                    selected && "ring-2 ring-neutral-900 ring-offset-1"
                  )}
                  style={{ backgroundColor: preset }}
                >
                  {selected && (
                    <Check
                      className="size-3.5"
                      style={{
                        color:
                          contrastRatio(preset, "#ffffff") > 2 ? "#fff" : "#000",
                      }}
                    />
                  )}
                </button>
              )
            })}
          </div>

          {ratio !== null && level && (
            <p className="rounded-lg bg-neutral-50 px-2.5 py-2 text-xs text-neutral-600">
              Contraste con {contrastLabel}:{" "}
              <span className="font-semibold text-neutral-900">
                {ratio.toFixed(1)}:1
              </span>
              <span className={cn("block font-medium", LEVEL_TEXT[level].className)}>
                {LEVEL_TEXT[level].label}
              </span>
            </p>
          )}

          {allowEmpty && valid && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="justify-start text-neutral-600"
              onClick={() => {
                onChange("")
                setOpen(false)
              }}
            >
              <X className="size-4" />
              Quitar color
            </Button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}

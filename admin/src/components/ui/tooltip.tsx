import * as React from "react"

import { cn } from "@/lib/utils"

interface TooltipProps {
  /** Título (negrita) del tooltip. */
  label: string
  /** Descripción breve opcional. */
  description?: string
  /** Lado donde aparece respecto al trigger. */
  side?: "top" | "bottom"
  children: React.ReactNode
  className?: string
}

/**
 * Tooltip ligero (sin dependencias): envuelve un control y muestra una
 * burbuja con título y descripción al pasar el mouse o enfocar con teclado.
 */
export function Tooltip({
  label,
  description,
  side = "top",
  children,
  className,
}: TooltipProps) {
  const [open, setOpen] = React.useState(false)

  return (
    <span
      className={cn("relative inline-flex", className)}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocusCapture={() => setOpen(true)}
      onBlurCapture={() => setOpen(false)}
    >
      {children}
      {open && (
        <span
          role="tooltip"
          className={cn(
            "pointer-events-none absolute left-1/2 z-50 w-max max-w-56 -translate-x-1/2 rounded-md bg-neutral-900 px-2.5 py-1.5 text-left text-xs text-white shadow-md",
            side === "top" ? "bottom-full mb-1.5" : "top-full mt-1.5"
          )}
        >
          <span className="block font-medium">{label}</span>
          {description && (
            <span className="mt-0.5 block text-neutral-300">
              {description}
            </span>
          )}
        </span>
      )}
    </span>
  )
}

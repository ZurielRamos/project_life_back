import { useState } from "react"
import { Lock, Shirt } from "lucide-react"

import { cn } from "@/lib/utils"
import { contrastRatio, isHexColor, mix } from "@/lib/color"
import { composeStoreTitle } from "@/lib/store-title"

interface StorePreviewProps {
  name: string
  title: string
  /** Título SEO propio (sección SEO); si existe, sustituye a «Título | Eslogan». */
  seoTitle?: string
  tagline: string
  logoUrl: string
  faviconUrl: string
  /** Color de marca (#RRGGBB). Vacío = el color por defecto de la plataforma. */
  primaryColor: string
  /** Segundo color de marca. Vacío = el que usa la plataforma por defecto. */
  secondaryColor: string
  /** Dirección que se muestra en la barra del navegador. */
  host: string
  className?: string
}

/** Color de marca que usa el sitio cuando la tienda no define uno. */
const DEFAULT_ACCENT = "#01B7BB"
const PURPLE = "#9600FC"

/**
 * Maqueta de la tienda con los datos de marca que se están editando: pestaña
 * del navegador (favicon + título), encabezado con logo, portada, productos y
 * pie. Permite revisar colores y logo antes de guardar.
 */
export function StorePreview({
  name,
  title,
  seoTitle,
  tagline,
  logoUrl,
  faviconUrl,
  primaryColor,
  secondaryColor,
  host,
  className,
}: StorePreviewProps) {
  const [mode, setMode] = useState<"dark" | "light">("dark")

  const accent = isHexColor(primaryColor) ? primaryColor : DEFAULT_ACCENT
  const accentDark = mix(accent, "#000000", 70)
  const accentSoft = mix(accent, "#ffffff", 65)
  const accent2 = isHexColor(secondaryColor) ? secondaryColor : PURPLE
  const buttonBg = `linear-gradient(100deg, ${accent} 0%, ${accent} 40%, ${accent2} 100%)`
  const whiteOnAccent = contrastRatio(accent, "#ffffff")

  const displayName = name.trim() || "Tu tienda"
  const tabTitle = composeStoreTitle({
    seoTitle,
    title,
    name: displayName,
    tagline,
  })
  const dark = mode === "dark"
  const chrome = dark
    ? { bg: "#0b0b0b", fg: "#ffffff", muted: "rgba(255,255,255,0.65)" }
    : { bg: "#f4f2ee", fg: "#12120f", muted: "rgba(18,18,15,0.6)" }

  const renderBrand = (size: "header" | "footer") =>
    logoUrl ? (
      <img
        src={logoUrl}
        alt=""
        className={cn(
          "w-auto object-contain",
          size === "header" ? "max-h-6" : "max-h-5"
        )}
      />
    ) : (
      <span
        className={cn(
          "font-bold tracking-tight",
          size === "header" ? "text-sm" : "text-xs"
        )}
      >
        {displayName}
      </span>
    )

  return (
    <section
      aria-label="Vista previa de la tienda"
      className={cn("flex flex-col gap-3", className)}
    >
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-neutral-900">
          Vista previa
        </h3>
        <div
          role="group"
          aria-label="Fondo del encabezado y el pie"
          className="flex rounded-lg bg-neutral-100 p-0.5 text-xs font-medium"
        >
          {(["dark", "light"] as const).map((m) => (
            <button
              key={m}
              type="button"
              aria-pressed={mode === m}
              onClick={() => setMode(m)}
              className={cn(
                "rounded-md px-2.5 py-1 transition-colors",
                mode === m
                  ? "bg-white text-neutral-900 shadow-sm"
                  : "text-neutral-500 hover:text-neutral-800"
              )}
            >
              {m === "dark" ? "Fondo oscuro" : "Fondo claro"}
            </button>
          ))}
        </div>
      </div>

      <div
        aria-hidden="true"
        className="overflow-hidden rounded-2xl border bg-white shadow-sm"
      >
        {/* Barra del navegador: pestaña con favicon y título */}
        <div className="flex items-end gap-2 bg-neutral-200/70 px-3 pt-2">
          <div className="mb-2 flex gap-1">
            <span className="size-2 rounded-full bg-neutral-400/70" />
            <span className="size-2 rounded-full bg-neutral-400/70" />
            <span className="size-2 rounded-full bg-neutral-400/70" />
          </div>
          <div className="flex min-w-0 max-w-[60%] items-center gap-1.5 rounded-t-lg bg-white px-2.5 py-1.5">
            {faviconUrl ? (
              <img
                src={faviconUrl}
                alt=""
                className="size-3.5 shrink-0 object-contain"
              />
            ) : (
              <span className="size-3.5 shrink-0 rounded-[3px] bg-neutral-300" />
            )}
            <span className="truncate text-[10px] font-medium text-neutral-700">
              {tabTitle}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1.5 border-b bg-white px-3 py-1.5">
          <Lock className="size-2.5 text-neutral-400" />
          <span className="truncate text-[10px] text-neutral-500">{host}</span>
        </div>

        {/* Encabezado */}
        <div
          className="grid grid-cols-3 items-center px-4 py-2.5"
          style={{ backgroundColor: chrome.bg, color: chrome.fg }}
        >
          <div
            className="flex gap-2 text-[7px] font-semibold tracking-widest"
            style={{ color: chrome.muted }}
          >
            <span>MUJER</span>
            <span>HOMBRE</span>
            <span>KIDS</span>
          </div>
          <div className="flex justify-center">
            {renderBrand("header")}
          </div>
          <div className="flex justify-end gap-1.5">
            <span
              className="size-3 rounded-full"
              style={{ backgroundColor: chrome.muted }}
            />
            <span
              className="size-3 rounded-full"
              style={{ backgroundColor: chrome.muted }}
            />
          </div>
        </div>

        {/* Portada */}
        <div
          className="flex flex-col gap-2 px-5 py-6 text-white"
          style={{
            background: `linear-gradient(135deg, #121212 0%, ${mix(accent, "#0b0b0b", 30)} 100%)`,
          }}
        >
          <p
            className="text-[8px] tracking-[0.22em] uppercase"
            style={{ color: accentSoft }}
          >
            {tagline.trim() || "Tu eslogan aquí"}
          </p>
          <p className="text-[15px] leading-tight font-bold">
            Miles de diseños para tu ropa,
            <br />
            <span style={{ color: accent }}>o crea el tuyo</span>
          </p>
          <div className="mt-1 flex items-center gap-1 rounded-full bg-white py-1 pr-1 pl-3">
            <span className="flex-1 truncate text-[8px] text-neutral-400">
              Quiero una camiseta minimalista…
            </span>
            <span
              className="rounded-full px-2.5 py-1 text-[8px] font-bold text-white"
              style={{ background: buttonBg }}
            >
              Buscar
            </span>
          </div>
          <div className="flex flex-wrap gap-1">
            {["Anime", "Minimalista", "Streetwear"].map((chip) => (
              <span
                key={chip}
                className="rounded-full border px-2 py-0.5 text-[7px]"
                style={{
                  borderColor: `${accent}99`,
                  backgroundColor: `${accent}33`,
                }}
              >
                {chip}
              </span>
            ))}
          </div>
        </div>

        {/* Productos */}
        <div className="grid grid-cols-3 gap-2 bg-[#f4f2ee] p-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="rounded-lg bg-white p-1.5 shadow-sm">
              <div className="relative flex aspect-[4/5] items-center justify-center rounded-md bg-neutral-100">
                <Shirt className="size-6 text-neutral-300" />
                {i === 0 && (
                  <span
                    className="absolute top-1 left-1 rounded-full px-1.5 py-0.5 text-[6px] font-bold text-white"
                    style={{ backgroundColor: accent }}
                  >
                    NUEVO
                  </span>
                )}
              </div>
              <div className="mt-1.5 h-1.5 w-4/5 rounded bg-neutral-200" />
              <div
                className="mt-1 h-1.5 w-2/5 rounded"
                style={{ backgroundColor: accentDark, opacity: 0.8 }}
              />
            </div>
          ))}
        </div>

        {/* Pie */}
        <div
          className="flex items-center justify-between gap-3 px-4 py-3"
          style={{ backgroundColor: chrome.bg, color: chrome.fg }}
        >
          <div className="flex min-w-0 flex-col gap-1">
            {renderBrand("footer")}
            <span
              className="truncate text-[7px]"
              style={{ color: chrome.muted }}
            >
              {tagline.trim() || "Tu eslogan aquí"}
            </span>
          </div>
          <div className="flex gap-1.5">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="size-3.5 rounded-full border"
                style={{ borderColor: chrome.muted, color: accentSoft }}
              />
            ))}
          </div>
        </div>
      </div>

      {whiteOnAccent < 3 && (
        <p
          role="status"
          className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800"
        >
          Los botones usan texto blanco y este color tiene poco contraste (
          {whiteOnAccent.toFixed(1)}:1). Prueba con un tono más oscuro para que
          se lea bien.
        </p>
      )}
      <p className="text-xs text-neutral-500">
        Vista orientativa: el sitio real incluye tus textos, imágenes y
        productos.
      </p>
    </section>
  )
}

import { useContext, useId, type CSSProperties } from "react"
import { Heart, Menu, Search, User } from "lucide-react"

import { cn } from "@/lib/utils"
import { isHexColor } from "@/lib/color"
import type { HeaderConfig, HeaderLayout } from "@/types/api"

import { Card, LinkList, Segmented, SwitchField } from "./fields"
import { SiteEditorContext } from "./site-context"

interface Props {
  value: HeaderConfig
  onChange: (value: HeaderConfig) => void
  /** Datos de marca para la vista previa. */
  brand: { name: string; logoUrl: string; primaryColor: string }
}

// ---------------------------------------------------------------------------
// Opciones
// ---------------------------------------------------------------------------

const LAYOUTS: { value: HeaderLayout; label: string; description: string }[] = [
  {
    value: "logo-center",
    label: "Logo centrado",
    description: "Menú a la izquierda e iconos a la derecha.",
  },
  {
    value: "logo-left",
    label: "Logo a la izquierda",
    description: "El menú junto al logo; iconos a la derecha.",
  },
  {
    value: "logo-left-menu-center",
    label: "Logo a la izquierda, menú centrado",
    description: "Diseño clásico de tienda en línea.",
  },
  {
    value: "logo-right",
    label: "Logo a la derecha",
    description: "Menú a la izquierda; iconos y logo a la derecha.",
  },
  {
    value: "stacked",
    label: "Apilado",
    description: "Logo centrado arriba y el menú en una segunda fila.",
  },
]

/** Áreas de cuadrícula de cada disposición (igual que en el sitio). */
const GRID: Record<HeaderLayout, CSSProperties> = {
  "logo-center": {
    gridTemplateAreas: '"menu brand actions"',
    gridTemplateColumns: "1fr auto 1fr",
  },
  "logo-left": {
    gridTemplateAreas: '"brand menu actions"',
    gridTemplateColumns: "auto 1fr auto",
  },
  "logo-left-menu-center": {
    gridTemplateAreas: '"brand menu actions"',
    gridTemplateColumns: "1fr auto 1fr",
  },
  "logo-right": {
    gridTemplateAreas: '"menu actions brand"',
    gridTemplateColumns: "1fr auto auto",
  },
  stacked: {
    gridTemplateAreas: '". brand actions" "menu menu menu"',
    gridTemplateColumns: "1fr auto 1fr",
    rowGap: 6,
  },
}

const BRAND_ALIGN: Record<HeaderLayout, CSSProperties["justifySelf"]> = {
  "logo-center": "center",
  "logo-left": "start",
  "logo-left-menu-center": "start",
  "logo-right": "end",
  stacked: "center",
}

const MENU_ALIGN: Record<HeaderLayout, CSSProperties["justifyContent"]> = {
  "logo-center": "flex-start",
  "logo-left": "flex-start",
  "logo-left-menu-center": "center",
  "logo-right": "flex-start",
  stacked: "center",
}

// ---------------------------------------------------------------------------
// Controles
// ---------------------------------------------------------------------------

/** Miniatura esquemática de una disposición (barras grises + logo). */
function LayoutThumb({ layout }: { layout: HeaderLayout }) {
  const bar = <span className="h-1 w-3 rounded-full bg-neutral-300" />
  const menu = (
    <span
      className="flex gap-1"
      style={{ gridArea: "menu", justifyContent: MENU_ALIGN[layout] }}
    >
      {bar}
      {bar}
      {bar}
    </span>
  )
  return (
    <div
      aria-hidden="true"
      className="grid h-12 w-full items-center gap-x-2 rounded-lg bg-neutral-100 px-2.5"
      style={GRID[layout]}
    >
      {menu}
      <span
        className="h-3 w-7 rounded bg-neutral-800"
        style={{ gridArea: "brand", justifySelf: BRAND_ALIGN[layout] }}
      />
      <span
        className="flex gap-1"
        style={{ gridArea: "actions", justifySelf: "end" }}
      >
        <span className="size-1.5 rounded-full bg-neutral-400" />
        <span className="size-1.5 rounded-full bg-neutral-400" />
      </span>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Vista previa
// ---------------------------------------------------------------------------

const LOGO_HEIGHT = { sm: 16, md: 20, lg: 26 } as const

function HeaderPreview({
  value,
  brand,
}: {
  value: HeaderConfig
  brand: Props["brand"]
}) {
  const dark = value.appearance !== "light"
  const accent = isHexColor(brand.primaryColor) ? brand.primaryColor : "#01B7BB"
  const fg = dark ? "#ffffff" : "#12120f"
  const background =
    value.appearance === "transparent"
      ? "linear-gradient(to bottom, rgba(0,0,0,0.5), rgba(0,0,0,0))"
      : value.appearance === "dark"
        ? "#0b0b0b"
        : "#f4f2ee"
  const links = value.navItems.filter((i) => i.label.trim()).slice(0, 8)
  const height = LOGO_HEIGHT[value.logoSize]

  return (
    <div
      aria-hidden="true"
      className="overflow-hidden rounded-xl border"
      style={{
        // Con fondo transparente se muestra sobre una portada de ejemplo.
        background:
          value.appearance === "transparent"
            ? `linear-gradient(135deg, #1b1b1b 0%, ${accent}66 120%)`
            : "#ffffff",
      }}
    >
      <div
        className={cn(
          "grid items-center gap-x-4 px-4",
          value.layout === "stacked" ? "py-3" : "h-14"
        )}
        style={{ ...GRID[value.layout], background, color: fg }}
      >
        {links.length > 0 && (
          <div
            className="flex min-w-0 flex-wrap gap-x-3 gap-y-1 text-[10px] font-semibold tracking-[0.1em]"
            style={{
              gridArea: "menu",
              justifyContent: MENU_ALIGN[value.layout],
              textTransform:
                value.menuCase === "uppercase" ? "uppercase" : "none",
              opacity: 0.92,
            }}
          >
            {links.map((l, i) => (
              <span key={i} className="truncate">
                {l.label}
              </span>
            ))}
          </div>
        )}
        <div
          className="flex items-center"
          style={{ gridArea: "brand", justifySelf: BRAND_ALIGN[value.layout] }}
        >
          {brand.logoUrl ? (
            <img
              src={brand.logoUrl}
              alt=""
              className="w-auto object-contain"
              style={{ height }}
            />
          ) : (
            <span
              className="font-bold tracking-tight whitespace-nowrap"
              style={{ fontSize: height * 0.75 }}
            >
              {brand.name || "Tu tienda"}
            </span>
          )}
        </div>
        <div
          className="flex items-center gap-2.5"
          style={{ gridArea: "actions", justifySelf: "end" }}
        >
          {value.showSearch && <Search className="size-3.5" />}
          {value.showFavorites && <Heart className="size-3.5" />}
          {value.showAccount && <User className="size-3.5" />}
        </div>
      </div>
      {/* Contenido de ejemplo debajo del encabezado */}
      <div className="flex h-16 flex-col justify-center gap-1.5 px-4">
        <span
          className="h-2 w-40 rounded-full"
          style={{
            background:
              value.appearance === "transparent"
                ? "rgba(255,255,255,0.75)"
                : "#e5e5e5",
          }}
        />
        <span
          className="h-2 w-24 rounded-full"
          style={{
            background:
              value.appearance === "transparent" ? accent : "#efefef",
          }}
        />
      </div>
    </div>
  )
}

/** Cómo se ve el encabezado en el móvil. */
function MobilePreview({
  value,
  brand,
}: {
  value: HeaderConfig
  brand: Props["brand"]
}) {
  const dark = value.appearance !== "light"
  return (
    <div
      aria-hidden="true"
      className="relative flex h-11 w-44 shrink-0 items-center justify-center rounded-xl border"
      style={{
        background: dark ? "#0b0b0b" : "#f4f2ee",
        color: dark ? "#fff" : "#12120f",
      }}
    >
      {value.mobileMenu && <Menu className="absolute left-3 size-4" />}
      {brand.logoUrl ? (
        <img src={brand.logoUrl} alt="" className="h-4 w-auto object-contain" />
      ) : (
        <span className="text-xs font-bold">{brand.name || "Tu tienda"}</span>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Editor
// ---------------------------------------------------------------------------

export function HeaderEditor({ value, onChange, brand }: Props) {
  const { readOnly } = useContext(SiteEditorContext)
  const name = useId()
  const set = (patch: Partial<HeaderConfig>) => onChange({ ...value, ...patch })

  return (
    <div className="flex flex-col gap-6">
      <Card
        title="Vista previa"
        description="Así se verá el encabezado con tu logo y tu menú."
      >
        <HeaderPreview value={value} brand={brand} />
        <div className="flex flex-wrap items-center gap-3">
          <MobilePreview value={value} brand={brand} />
          <p className="text-xs text-neutral-500">
            En el móvil se muestra el logo centrado
            {value.mobileMenu
              ? " y un botón de menú con tus enlaces."
              : " sin menú: los enlaces no se ven."}
          </p>
        </div>
      </Card>

      <Card
        title="Disposición"
        description="Dónde van el logo, el menú y los iconos."
      >
        <fieldset disabled={readOnly}>
          <legend className="sr-only">Disposición del encabezado</legend>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {LAYOUTS.map((option) => {
              const selected = value.layout === option.value
              return (
                <label
                  key={option.value}
                  className={cn(
                    "relative flex cursor-pointer flex-col gap-2.5 rounded-xl border p-3 transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-neutral-400",
                    selected
                      ? "border-neutral-900 ring-1 ring-neutral-900"
                      : "hover:border-neutral-400"
                  )}
                >
                  <input
                    type="radio"
                    name={name}
                    value={option.value}
                    checked={selected}
                    onChange={() => set({ layout: option.value })}
                    className="sr-only"
                  />
                  <LayoutThumb layout={option.value} />
                  <span>
                    <span className="block text-sm font-medium text-neutral-900">
                      {option.label}
                    </span>
                    <span className="block text-xs text-neutral-500">
                      {option.description}
                    </span>
                  </span>
                </label>
              )
            })}
          </div>
        </fieldset>
      </Card>

      <Card title="Estilo">
        <Segmented
          label="Fondo"
          value={value.appearance}
          onChange={(appearance) => set({ appearance })}
          options={[
            { value: "transparent", label: "Transparente" },
            { value: "dark", label: "Oscuro" },
            { value: "light", label: "Claro" },
          ]}
          hint={
            value.appearance === "transparent"
              ? "Transparente sobre la portada y oscuro al bajar. En las demás páginas se ve claro."
              : value.appearance === "dark"
                ? "Fondo oscuro en todas las páginas."
                : "Fondo claro en todas las páginas. Usa un logo que se lea sobre fondo claro."
          }
        />
        <Segmented
          label="Tamaño del logo"
          value={value.logoSize}
          onChange={(logoSize) => set({ logoSize })}
          options={[
            { value: "sm", label: "Pequeño" },
            { value: "md", label: "Mediano" },
            { value: "lg", label: "Grande" },
          ]}
        />
        <SwitchField
          label="Menú en mayúsculas"
          description="Muestra los enlaces en mayúsculas sin importar cómo los escribas."
          checked={value.menuCase === "uppercase"}
          onChange={(upper) =>
            set({ menuCase: upper ? "uppercase" : "as-typed" })
          }
        />
        <SwitchField
          label="Fijo al hacer scroll"
          description="El encabezado se queda arriba mientras se recorre la página."
          checked={value.sticky}
          onChange={(sticky) => set({ sticky })}
        />
      </Card>

      <Card title="Iconos" description="Accesos a la derecha del encabezado.">
        <SwitchField
          label="Buscar"
          description="Lleva al catálogo con el buscador."
          checked={value.showSearch}
          onChange={(showSearch) => set({ showSearch })}
        />
        <SwitchField
          label="Mi cuenta"
          description="Inicio de sesión y menú de la cuenta del cliente."
          checked={value.showAccount}
          onChange={(showAccount) => set({ showAccount })}
        />
        <SwitchField
          label="Favoritos"
          description="La página de favoritos aún no está disponible: el icono llevaría a una página vacía."
          checked={value.showFavorites}
          onChange={(showFavorites) => set({ showFavorites })}
        />
      </Card>

      <Card title="Móvil">
        <SwitchField
          label="Botón de menú en el móvil"
          description="Muestra un botón que abre un panel lateral con los enlaces del menú y el buscador."
          checked={value.mobileMenu}
          onChange={(mobileMenu) => set({ mobileMenu })}
        />
      </Card>

      <Card
        title="Menú de navegación"
        description="Enlaces del encabezado (hasta 8)."
      >
        <LinkList
          items={value.navItems}
          onChange={(navItems) => set({ navItems })}
          max={8}
          itemLabel="enlace"
          addLabel="Agregar enlace"
          emptyLabel="Sin enlaces: el encabezado mostrará solo el logo y los iconos."
          textPlaceholder="MUJER"
          newItem={{ label: "", url: "/tienda" }}
        />
      </Card>
    </div>
  )
}

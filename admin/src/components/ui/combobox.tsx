import * as React from "react"
import { Check, ChevronsUpDown, Search } from "lucide-react"

import { cn } from "@/lib/utils"

export interface ComboboxOption {
  value: string
  label: string
}

interface ComboboxProps {
  options: ComboboxOption[]
  value: string
  onChange: (value: string) => void
  placeholder?: string
  /** Texto cuando no hay coincidencias. */
  emptyText?: string
  disabled?: boolean
  id?: string
  className?: string
}

/**
 * Combobox con búsqueda (autocomplete) construido sobre un input + lista
 * filtrada. Pensado para listas largas: filtra por texto, navega con
 * teclado (↑/↓/Enter/Esc) y cierra al hacer clic fuera. No depende de
 * librerías extra (cmdk/popover).
 */
export function Combobox({
  options,
  value,
  onChange,
  placeholder = "Buscar…",
  emptyText = "Sin resultados.",
  disabled,
  id,
  className,
}: ComboboxProps) {
  const [open, setOpen] = React.useState(false)
  const [query, setQuery] = React.useState("")
  const [activeIndex, setActiveIndex] = React.useState(0)

  const containerRef = React.useRef<HTMLDivElement>(null)
  const inputRef = React.useRef<HTMLInputElement>(null)
  const listRef = React.useRef<HTMLUListElement>(null)

  const selected = options.find((o) => o.value === value) ?? null

  // Mientras el combobox está cerrado, el input muestra la etiqueta elegida;
  // al abrirse, muestra lo que el usuario escribe para filtrar.
  const inputValue = open ? query : (selected?.label ?? "")

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return options
    return options.filter((o) => o.label.toLowerCase().includes(q))
  }, [options, query])

  // Cierra al hacer clic fuera.
  React.useEffect(() => {
    if (!open) return
    function onPointerDown(e: MouseEvent) {
      const target = e.target as Node
      if (containerRef.current && !containerRef.current.contains(target)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", onPointerDown)
    return () => document.removeEventListener("mousedown", onPointerDown)
  }, [open])

  // Mantiene el ítem activo visible al navegar con el teclado.
  React.useEffect(() => {
    if (!open) return
    const node = listRef.current?.children[activeIndex] as
      | HTMLElement
      | undefined
    node?.scrollIntoView({ block: "nearest" })
  }, [activeIndex, open])

  function openMenu() {
    if (disabled) return
    setQuery("")
    setActiveIndex(
      Math.max(
        0,
        options.findIndex((o) => o.value === value)
      )
    )
    setOpen(true)
  }

  function select(option: ComboboxOption) {
    onChange(option.value)
    setOpen(false)
    setQuery("")
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open && (e.key === "ArrowDown" || e.key === "Enter")) {
      e.preventDefault()
      openMenu()
      return
    }
    if (!open) return

    if (e.key === "ArrowDown") {
      e.preventDefault()
      setActiveIndex((i) => Math.min(i + 1, filtered.length - 1))
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      setActiveIndex((i) => Math.max(i - 1, 0))
    } else if (e.key === "Enter") {
      e.preventDefault()
      const option = filtered[activeIndex]
      if (option) select(option)
    } else if (e.key === "Escape") {
      e.preventDefault()
      setOpen(false)
      setQuery("")
    }
  }

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <div className="relative">
        {open && (
          <Search className="text-muted-foreground pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2" />
        )}
        <input
          id={id}
          ref={inputRef}
          role="combobox"
          aria-expanded={open}
          aria-controls={id ? `${id}-listbox` : undefined}
          autoComplete="off"
          disabled={disabled}
          value={inputValue}
          placeholder={placeholder}
          onChange={(e) => {
            if (!open) setOpen(true)
            setQuery(e.target.value)
            setActiveIndex(0)
          }}
          onFocus={openMenu}
          onClick={openMenu}
          onKeyDown={handleKeyDown}
          className={cn(
            "border-input placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 flex h-9 w-full min-w-0 rounded-md border bg-transparent py-1 pr-9 text-sm shadow-xs transition-[color,box-shadow] outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50",
            open ? "pl-9" : "pl-3"
          )}
        />
        <ChevronsUpDown className="text-muted-foreground pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 opacity-50" />
      </div>

      {open && (
        <ul
          ref={listRef}
          id={id ? `${id}-listbox` : undefined}
          role="listbox"
          className="bg-popover text-popover-foreground absolute z-50 mt-1 max-h-72 w-full overflow-y-auto rounded-md border p-1 shadow-md"
        >
          {filtered.length === 0 ? (
            <li className="text-muted-foreground px-2 py-1.5 text-sm">
              {emptyText}
            </li>
          ) : (
            filtered.map((option, index) => {
              const isSelected = option.value === value
              const isActive = index === activeIndex
              return (
                <li
                  key={option.value}
                  role="option"
                  aria-selected={isSelected}
                  onMouseEnter={() => setActiveIndex(index)}
                  // onMouseDown en vez de onClick: se dispara antes del blur
                  // del input, evitando que el menú se cierre antes de elegir.
                  onMouseDown={(e) => {
                    e.preventDefault()
                    select(option)
                  }}
                  className={cn(
                    "flex cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-sm",
                    isActive && "bg-accent text-accent-foreground"
                  )}
                >
                  <Check
                    className={cn(
                      "size-4 shrink-0",
                      isSelected ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <span className="truncate">{option.label}</span>
                </li>
              )
            })
          )}
        </ul>
      )}
    </div>
  )
}

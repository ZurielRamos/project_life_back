import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react"
import { DndProvider, useDrag, useDrop } from "react-dnd"
import { HTML5Backend } from "react-dnd-html5-backend"
import { GripVertical } from "lucide-react"

import { cn } from "@/lib/utils"

/**
 * Proveedor de arrastrar y soltar. Se monta una vez en la raíz de la app.
 */
export function DragAndDropProvider({ children }: { children: ReactNode }) {
  return <DndProvider backend={HTML5Backend}>{children}</DndProvider>
}

interface DragItem {
  /** Lista de origen: solo se puede soltar dentro de la misma lista. */
  listId: string
  index: number
}

/** Lo que recibe cada fila para pintar su contenido. */
export interface SortableRenderProps {
  /** Asa de arrastre (también se ordena con las flechas del teclado). */
  handle: ReactNode
  isDragging: boolean
  index: number
}

interface SortableListProps<T> {
  items: T[]
  /** Se llama con la lista ya reordenada. */
  onReorder: (items: T[]) => void
  renderItem: (item: T, props: SortableRenderProps) => ReactNode
  /** Nombre de cada elemento para lectores de pantalla ("enlace", "sección"…). */
  itemLabel: string
  /** Texto de cada elemento para anunciarlo al moverlo. */
  getItemName?: (item: T, index: number) => string
  disabled?: boolean
  className?: string
  /** Etiqueta de la lista (`ul`/`ol`). */
  as?: "ul" | "ol"
  itemClassName?: string
}

let listCounter = 0

/**
 * Lista ordenable con react-dnd. Se arrastra desde el asa (⋮⋮) y, con el foco
 * en el asa, ↑ y ↓ mueven el elemento: así también funciona con teclado.
 */
export function SortableList<T>({
  items,
  onReorder,
  renderItem,
  itemLabel,
  getItemName,
  disabled,
  className,
  as: Tag = "ul",
  itemClassName,
}: SortableListProps<T>) {
  // Id estable por lista: impide soltar elementos de una lista en otra.
  const [listId] = useState(() => `sortable-${++listCounter}`)
  const [announcement, setAnnouncement] = useState("")
  const handles = useRef(new Map<number, HTMLButtonElement>())
  const pendingFocus = useRef<number | null>(null)
  // Última versión de la lista: el arrastre mueve varias veces seguidas.
  const latest = useRef(items)
  useLayoutEffect(() => {
    latest.current = items
  }, [items])

  const move = useCallback(
    (from: number, to: number) => {
      const list = latest.current
      if (to < 0 || to >= list.length || from === to) return
      const next = [...list]
      const [moved] = next.splice(from, 1)
      next.splice(to, 0, moved)
      latest.current = next
      onReorder(next)
    },
    [onReorder]
  )

  // Tras mover con el teclado, el foco sigue al elemento en su nueva posición.
  useEffect(() => {
    if (pendingFocus.current === null) return
    handles.current.get(pendingFocus.current)?.focus()
    pendingFocus.current = null
  })

  const nameOf = (index: number) =>
    getItemName?.(items[index], index) || `${itemLabel} ${index + 1}`

  function handleKey(e: KeyboardEvent<HTMLButtonElement>, index: number) {
    const delta = e.key === "ArrowUp" ? -1 : e.key === "ArrowDown" ? 1 : 0
    if (!delta) return
    e.preventDefault()
    const to = index + delta
    if (to < 0 || to >= items.length) return
    const name = nameOf(index)
    move(index, to)
    pendingFocus.current = to
    setAnnouncement(`${name}: posición ${to + 1} de ${items.length}`)
  }

  return (
    <>
      <Tag className={className}>
        {items.map((item, index) => (
          <SortableRow
            key={index}
            listId={listId}
            index={index}
            move={move}
            disabled={disabled}
            className={itemClassName}
            onDropped={(to) =>
              setAnnouncement(`${nameOf(to)}: posición ${to + 1} de ${items.length}`)
            }
          >
            {(dragRef, isDragging) =>
              renderItem(item, {
                index,
                isDragging,
                handle: disabled ? null : (
                  <button
                    type="button"
                    ref={(el) => {
                      dragRef(el)
                      if (el) handles.current.set(index, el)
                      else handles.current.delete(index)
                    }}
                    onKeyDown={(e) => handleKey(e, index)}
                    aria-label={`Mover ${nameOf(index)}. Arrastra o usa las flechas arriba y abajo.`}
                    title="Arrastra para reordenar (o usa ↑ ↓)"
                    className="flex size-8 shrink-0 cursor-grab touch-none items-center justify-center rounded-md text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 focus-visible:ring-2 focus-visible:ring-neutral-400 focus-visible:outline-none active:cursor-grabbing"
                  >
                    <GripVertical className="size-4" />
                  </button>
                ),
              })
            }
          </SortableRow>
        ))}
      </Tag>
      <span role="status" aria-live="polite" className="sr-only">
        {announcement}
      </span>
    </>
  )
}

function SortableRow({
  listId,
  index,
  move,
  disabled,
  className,
  onDropped,
  children,
}: {
  listId: string
  index: number
  move: (from: number, to: number) => void
  disabled?: boolean
  className?: string
  onDropped: (to: number) => void
  children: (
    dragRef: (el: HTMLElement | null) => void,
    isDragging: boolean
  ) => ReactNode
}) {
  const rowRef = useRef<HTMLLIElement>(null)

  const [, drop] = useDrop<DragItem>({
    accept: listId,
    hover(item, monitor) {
      const row = rowRef.current
      if (!row || item.index === index) return
      // Solo se cambia de lugar al cruzar la mitad de la fila: evita saltos.
      const rect = row.getBoundingClientRect()
      const middle = (rect.bottom - rect.top) / 2
      const offset = monitor.getClientOffset()
      if (!offset) return
      const y = offset.y - rect.top
      if (item.index < index && y < middle) return
      if (item.index > index && y > middle) return
      move(item.index, index)
      item.index = index
    },
  })

  const [{ isDragging }, drag, preview] = useDrag({
    type: listId,
    item: (): DragItem => ({ listId, index }),
    canDrag: !disabled,
    // Las filas usan el índice como clave: se compara por posición actual.
    isDragging: (monitor) => monitor.getItem<DragItem>().index === index,
    collect: (monitor) => ({ isDragging: monitor.isDragging() }),
    end: (item) => onDropped(item.index),
  })

  return (
    <li
      ref={(el) => {
        rowRef.current = el
        preview(drop(el))
      }}
      className={cn(
        "transition-opacity",
        isDragging && "opacity-40",
        className
      )}
    >
      {children((el) => {
        drag(el)
      }, isDragging)}
    </li>
  )
}

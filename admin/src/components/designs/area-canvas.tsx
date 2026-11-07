import { useEffect, useRef, useState } from "react"
import { Image as KonvaImage, Layer, Rect, Stage, Transformer } from "react-konva"
import type Konva from "konva"
import {
  AlignCenterHorizontal,
  AlignCenterVertical,
  AlignEndHorizontal,
  AlignEndVertical,
  AlignStartHorizontal,
  AlignStartVertical,
  MoveHorizontal,
  MoveVertical,
  Redo2,
  Undo2,
} from "lucide-react"

import type { DesignArea } from "@/types/api"
import { Button } from "@/components/ui/button"
import { Tooltip } from "@/components/ui/tooltip"

/**
 * Una imagen colocada dentro de un área de diseño. La geometría está en px
 * de la plantilla (espacio del smart object, B1); el campo heredado
 * `printAreaId` transporta el `uuid` del smart object.
 */
export interface Placement {
  /** id temporal en el editor (no es el id de BD). */
  key: string
  /** uuid del smart object al que pertenece (viaja como printAreaId). */
  printAreaId: string
  imageUrl: string
  imagePublicId?: string
  /** Geometría en px del smart object (nombres *Mm por compatibilidad). */
  xMm: number
  yMm: number
  widthMm: number
  heightMm: number
  rotation: number
  /** Si la imagen vino de una plantilla SVG: su origen para re-edición. */
  svgUrl?: string
  fieldValues?: Record<string, string>
  /**
   * Metadatos de edición (solo cliente, no se envían al backend): el texto
   * del SVG y las alineaciones elegidas, para poder reabrir el editor de
   * textos y hacer cambios.
   */
  svgText?: string
  fieldAligns?: Record<string, string>
}

interface AreaCanvasProps {
  area: DesignArea
  placements: Placement[]
  selectedKey: string | null
  onSelect: (key: string | null) => void
  onChange: (key: string, patch: Partial<Placement>) => void
  /** Reemplaza TODAS las placements de esta área (para deshacer/rehacer). */
  onReplaceAreaPlacements: (next: Placement[]) => void
}

/** Ancho objetivo del canvas en px (el alto se deriva de la proporción). */
const CANVAS_WIDTH_PX = 320

/** Carga una imagen del DOM para usarla en Konva. */
function useHtmlImage(url: string): HTMLImageElement | null {
  const [img, setImg] = useState<HTMLImageElement | null>(null)
  useEffect(() => {
    const image = new window.Image()
    image.crossOrigin = "anonymous"
    image.src = url
    image.onload = () => setImg(image)
    return () => {
      image.onload = null
    }
  }, [url])
  return img
}

/** Imagen colocada + su transformer cuando está seleccionada. */
function PlacedImage({
  placement,
  mmToPx,
  isSelected,
  onSelect,
  onChange,
}: {
  placement: Placement
  mmToPx: number
  isSelected: boolean
  onSelect: () => void
  onChange: (patch: Partial<Placement>) => void
}) {
  const img = useHtmlImage(placement.imageUrl)
  const shapeRef = useRef<Konva.Image>(null)
  const trRef = useRef<Konva.Transformer>(null)

  useEffect(() => {
    if (isSelected && trRef.current && shapeRef.current) {
      trRef.current.nodes([shapeRef.current])
      trRef.current.getLayer()?.batchDraw()
    }
  }, [isSelected, img])

  if (!img) return null

  return (
    <>
      <KonvaImage
        ref={shapeRef}
        image={img}
        x={placement.xMm * mmToPx}
        y={placement.yMm * mmToPx}
        width={placement.widthMm * mmToPx}
        height={placement.heightMm * mmToPx}
        rotation={placement.rotation}
        draggable
        onClick={onSelect}
        onTap={onSelect}
        onDragEnd={(e) => {
          onChange({
            xMm: e.target.x() / mmToPx,
            yMm: e.target.y() / mmToPx,
          })
        }}
        onTransformEnd={() => {
          const node = shapeRef.current
          if (!node) return
          const scaleX = node.scaleX()
          const scaleY = node.scaleY()
          // Konva aplica el resize como escala; lo convertimos a width/height
          // reales y reseteamos la escala.
          node.scaleX(1)
          node.scaleY(1)
          onChange({
            xMm: node.x() / mmToPx,
            yMm: node.y() / mmToPx,
            widthMm: Math.max(1, (node.width() * scaleX) / mmToPx),
            heightMm: Math.max(1, (node.height() * scaleY) / mmToPx),
            rotation: node.rotation(),
          })
        }}
      />
      {isSelected && (
        <Transformer
          ref={trRef}
          rotateEnabled
          // Proporcional por defecto; se deforma libremente solo con Shift.
          keepRatio
          shiftBehavior="inverted"
          // Solo esquinas: escalan manteniendo la proporción.
          enabledAnchors={[
            "top-left",
            "top-right",
            "bottom-left",
            "bottom-right",
          ]}
          boundBoxFunc={(oldBox, newBox) =>
            newBox.width < 5 || newBox.height < 5 ? oldBox : newBox
          }
        />
      )}
    </>
  )
}

/** Snapshot inmutable de las placements de un área (para el historial). */
function snapshot(placements: Placement[]): Placement[] {
  return placements.map((p) => ({ ...p }))
}

function sameSnapshot(a: Placement[], b: Placement[]): boolean {
  if (a.length !== b.length) return false
  return a.every((p, i) => {
    const q = b[i]
    return (
      p.key === q.key &&
      p.imageUrl === q.imageUrl &&
      p.xMm === q.xMm &&
      p.yMm === q.yMm &&
      p.widthMm === q.widthMm &&
      p.heightMm === q.heightMm &&
      p.rotation === q.rotation
    )
  })
}

export function AreaCanvas({
  area,
  placements,
  selectedKey,
  onSelect,
  onChange,
  onReplaceAreaPlacements,
}: AreaCanvasProps) {
  const widthMm = area.widthPx || 100
  const heightMm = area.heightPx || 100
  const mmToPx = CANVAS_WIDTH_PX / widthMm
  const stageWidth = widthMm * mmToPx
  const stageHeight = heightMm * mmToPx

  // Historial por área. `past` son estados anteriores; `future`, los
  // rehacer. `current` es el último snapshot conocido.
  const [past, setPast] = useState<Placement[][]>([])
  const [future, setFuture] = useState<Placement[][]>([])
  const currentRef = useRef<Placement[]>(snapshot(placements))
  // Marca para ignorar el cambio de prop causado por nuestro propio undo/redo.
  const applyingHistoryRef = useRef(false)

  // Cada vez que cambian las placements por una edición del usuario (no por
  // undo/redo), empuja el estado anterior al historial y limpia el redo.
  useEffect(() => {
    if (applyingHistoryRef.current) {
      applyingHistoryRef.current = false
      currentRef.current = snapshot(placements)
      return
    }
    if (sameSnapshot(currentRef.current, placements)) return
    setPast((prev) => [...prev, currentRef.current])
    setFuture([])
    currentRef.current = snapshot(placements)
  }, [placements])

  function undo() {
    if (past.length === 0) return
    const previous = past[past.length - 1]
    setPast((prev) => prev.slice(0, -1))
    setFuture((prev) => [snapshot(placements), ...prev])
    applyingHistoryRef.current = true
    onReplaceAreaPlacements(snapshot(previous))
  }

  function redo() {
    if (future.length === 0) return
    const next = future[0]
    setFuture((prev) => prev.slice(1))
    setPast((prev) => [...prev, snapshot(placements)])
    applyingHistoryRef.current = true
    onReplaceAreaPlacements(snapshot(next))
  }

  // Placement seleccionado dentro de ESTA área (si lo hay).
  const selected = placements.find((p) => p.key === selectedKey) ?? null

  type HAlign = "left" | "center" | "right"
  type VAlign = "top" | "middle" | "bottom"

  /** Alinea el placement seleccionado respecto al área (caja sin rotar). */
  function alignHorizontal(mode: HAlign) {
    if (!selected) return
    const xMm =
      mode === "left"
        ? 0
        : mode === "center"
          ? (widthMm - selected.widthMm) / 2
          : widthMm - selected.widthMm
    onChange(selected.key, { xMm })
  }

  function alignVertical(mode: VAlign) {
    if (!selected) return
    const yMm =
      mode === "top"
        ? 0
        : mode === "middle"
          ? (heightMm - selected.heightMm) / 2
          : heightMm - selected.heightMm
    onChange(selected.key, { yMm })
  }

  /**
   * Expande el objeto para ocupar todo el ancho del área, ajustando el alto
   * de forma proporcional. Lo pega a la izquierda y lo centra verticalmente.
   */
  function expandToWidth() {
    if (!selected) return
    const ratio = selected.heightMm / selected.widthMm || 1
    const newW = widthMm
    const newH = newW * ratio
    onChange(selected.key, {
      widthMm: newW,
      heightMm: newH,
      xMm: 0,
      yMm: (heightMm - newH) / 2,
    })
  }

  /**
   * Expande el objeto para ocupar todo el alto del área, ajustando el ancho
   * de forma proporcional. Lo pega arriba y lo centra horizontalmente.
   */
  function expandToHeight() {
    if (!selected) return
    const ratio = selected.widthMm / selected.heightMm || 1
    const newH = heightMm
    const newW = newH * ratio
    onChange(selected.key, {
      widthMm: newW,
      heightMm: newH,
      xMm: (widthMm - newW) / 2,
      yMm: 0,
    })
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-1">
        {/* Historial (solo iconos). */}
        <Tooltip
          label="Deshacer"
          description="Revierte el último cambio en esta área."
        >
          <Button
            data-keep-selection
            type="button"
            variant="outline"
            size="icon"
            className="size-8"
            aria-label="Deshacer"
            disabled={past.length === 0}
            onClick={undo}
          >
            <Undo2 className="size-4" />
          </Button>
        </Tooltip>
        <Tooltip
          label="Rehacer"
          description="Vuelve a aplicar el cambio deshecho."
        >
          <Button
            data-keep-selection
            type="button"
            variant="outline"
            size="icon"
            className="size-8"
            aria-label="Rehacer"
            disabled={future.length === 0}
            onClick={redo}
          >
            <Redo2 className="size-4" />
          </Button>
        </Tooltip>

        <span className="bg-border mx-1 h-6 w-px" aria-hidden />

        {/* Alineación horizontal del objeto seleccionado. */}
        <div className="flex items-center gap-0.5">
          <Tooltip
            label="Alinear a la izquierda"
            description="Pega el objeto al borde izquierdo del área."
          >
            <Button
              data-keep-selection
              type="button"
              variant="outline"
              size="icon"
              className="size-8"
              aria-label="Alinear a la izquierda"
              disabled={!selected}
              onClick={() => alignHorizontal("left")}
            >
              <AlignStartVertical className="size-4" />
            </Button>
          </Tooltip>
          <Tooltip
            label="Centrar horizontalmente"
            description="Centra el objeto en el eje horizontal del área."
          >
            <Button
              data-keep-selection
              type="button"
              variant="outline"
              size="icon"
              className="size-8"
              aria-label="Centrar horizontalmente"
              disabled={!selected}
              onClick={() => alignHorizontal("center")}
            >
              <AlignCenterVertical className="size-4" />
            </Button>
          </Tooltip>
          <Tooltip
            label="Alinear a la derecha"
            description="Pega el objeto al borde derecho del área."
          >
            <Button
              data-keep-selection
              type="button"
              variant="outline"
              size="icon"
              className="size-8"
              aria-label="Alinear a la derecha"
              disabled={!selected}
              onClick={() => alignHorizontal("right")}
            >
              <AlignEndVertical className="size-4" />
            </Button>
          </Tooltip>
        </div>

        {/* Alineación vertical del objeto seleccionado. */}
        <div className="flex items-center gap-0.5">
          <Tooltip
            label="Alinear arriba"
            description="Pega el objeto al borde superior del área."
          >
            <Button
              data-keep-selection
              type="button"
              variant="outline"
              size="icon"
              className="size-8"
              aria-label="Alinear arriba"
              disabled={!selected}
              onClick={() => alignVertical("top")}
            >
              <AlignStartHorizontal className="size-4" />
            </Button>
          </Tooltip>
          <Tooltip
            label="Centrar verticalmente"
            description="Centra el objeto en el eje vertical del área."
          >
            <Button
              data-keep-selection
              type="button"
              variant="outline"
              size="icon"
              className="size-8"
              aria-label="Centrar verticalmente"
              disabled={!selected}
              onClick={() => alignVertical("middle")}
            >
              <AlignCenterHorizontal className="size-4" />
            </Button>
          </Tooltip>
          <Tooltip
            label="Alinear abajo"
            description="Pega el objeto al borde inferior del área."
          >
            <Button
              data-keep-selection
              type="button"
              variant="outline"
              size="icon"
              className="size-8"
              aria-label="Alinear abajo"
              disabled={!selected}
              onClick={() => alignVertical("bottom")}
            >
              <AlignEndHorizontal className="size-4" />
            </Button>
          </Tooltip>
        </div>

        <span className="bg-border mx-1 h-6 w-px" aria-hidden />

        {/* Expandir manteniendo la proporción. */}
        <div className="flex items-center gap-0.5">
          <Tooltip
            label="Expandir a lo ancho"
            description="Ajusta el ancho al del área; el alto cambia proporcionalmente."
          >
            <Button
              data-keep-selection
              type="button"
              variant="outline"
              size="icon"
              className="size-8"
              aria-label="Expandir a lo ancho"
              disabled={!selected}
              onClick={expandToWidth}
            >
              <MoveHorizontal className="size-4" />
            </Button>
          </Tooltip>
          <Tooltip
            label="Expandir a lo alto"
            description="Ajusta el alto al del área; el ancho cambia proporcionalmente."
          >
            <Button
              data-keep-selection
              type="button"
              variant="outline"
              size="icon"
              className="size-8"
              aria-label="Expandir a lo alto"
              disabled={!selected}
              onClick={expandToHeight}
            >
              <MoveVertical className="size-4" />
            </Button>
          </Tooltip>
        </div>
      </div>
      <Stage
        width={stageWidth}
        height={stageHeight}
        className="rounded-lg border bg-neutral-50"
        onMouseDown={(e) => {
          // Clic en cualquier parte que no sea una imagen (el Stage o el
          // rectángulo de fondo) deselecciona.
          const target = e.target
          if (target === target.getStage() || target.name() === "area-bg") {
            onSelect(null)
          }
        }}
        onTouchStart={(e) => {
          const target = e.target
          if (target === target.getStage() || target.name() === "area-bg") {
            onSelect(null)
          }
        }}
      >
        <Layer>
          {/* Fondo del área de impresión */}
          <Rect
            name="area-bg"
            x={0}
            y={0}
            width={stageWidth}
            height={stageHeight}
            fill="#ffffff"
            stroke="#d4d4d4"
            dash={[4, 4]}
          />
          {placements.map((p) => (
            <PlacedImage
              key={p.key}
              placement={p}
              mmToPx={mmToPx}
              isSelected={p.key === selectedKey}
              onSelect={() => onSelect(p.key)}
              onChange={(patch) => onChange(p.key, patch)}
            />
          ))}
        </Layer>
      </Stage>
    </div>
  )
}

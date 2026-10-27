import { useEffect, useRef, useState } from "react"
import { Image as KonvaImage, Layer, Rect, Stage, Transformer } from "react-konva"
import type Konva from "konva"

import type { PrintArea } from "@/types/api"

/** Una imagen colocada, en coordenadas de milímetros del área. */
export interface Placement {
  /** id temporal en el editor (no es el id de BD). */
  key: string
  printAreaId: string
  imageUrl: string
  imagePublicId?: string
  xMm: number
  yMm: number
  widthMm: number
  heightMm: number
  rotation: number
}

interface AreaCanvasProps {
  area: PrintArea
  placements: Placement[]
  selectedKey: string | null
  onSelect: (key: string | null) => void
  onChange: (key: string, patch: Partial<Placement>) => void
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
          boundBoxFunc={(oldBox, newBox) =>
            newBox.width < 5 || newBox.height < 5 ? oldBox : newBox
          }
        />
      )}
    </>
  )
}

export function AreaCanvas({
  area,
  placements,
  selectedKey,
  onSelect,
  onChange,
}: AreaCanvasProps) {
  const widthMm = area.widthMm ?? 100
  const heightMm = area.heightMm ?? 100
  const mmToPx = CANVAS_WIDTH_PX / widthMm
  const stageWidth = widthMm * mmToPx
  const stageHeight = heightMm * mmToPx

  return (
    <div className="inline-block">
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

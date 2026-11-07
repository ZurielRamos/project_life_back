import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Design } from './design.entity';

/**
 * Una imagen colocada dentro de un área de impresión de un diseño.
 *
 * La geometría se guarda en MILÍMETROS (sistema de coordenadas del área
 * de impresión, origen en su esquina superior izquierda), no en píxeles
 * de pantalla. El canvas del editor es solo una representación escalada;
 * los mm son la fuente de verdad para producir/renderizar.
 */
@Entity('design_placements')
export class DesignPlacement {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @ManyToOne(() => Design, (design) => design.placements, {
    onDelete: 'CASCADE',
    nullable: false,
  })
  @JoinColumn({ name: 'design_id' })
  design: Design;

  @Column({ name: 'design_id' })
  designId: string;

  /** Área de impresión (del producto) sobre la que se coloca la imagen. */
  @Column({ name: 'print_area_id', type: 'uuid' })
  printAreaId: string;

  /** Imagen en Cloudinary. */
  @Column({ name: 'image_url', type: 'text' })
  imageUrl: string;

  @Column({ name: 'image_public_id', type: 'varchar', nullable: true })
  imagePublicId: string | null;

  /**
   * Si la imagen se generó desde una plantilla SVG con texto editable:
   * URL del SVG fuente (raw en Cloudinary) y los valores de los campos
   * `<text id>` usados. Permiten re-editar los nombres sin resubir el SVG.
   * Null cuando la imagen se cargó directamente (no vino de un SVG).
   */
  @Column({ name: 'svg_url', type: 'text', nullable: true })
  svgUrl: string | null;

  @Column({ name: 'field_values', type: 'jsonb', nullable: true })
  fieldValues: Record<string, string> | null;

  // --- Geometría en milímetros dentro del área de impresión ---

  /** Offset X desde la esquina superior izquierda del área (mm). */
  @Column({ name: 'x_mm', type: 'double precision', default: 0 })
  xMm: number;

  /** Offset Y desde la esquina superior izquierda del área (mm). */
  @Column({ name: 'y_mm', type: 'double precision', default: 0 })
  yMm: number;

  /** Ancho de la imagen colocada (mm). */
  @Column({ name: 'width_mm', type: 'double precision' })
  widthMm: number;

  /** Alto de la imagen colocada (mm). */
  @Column({ name: 'height_mm', type: 'double precision' })
  heightMm: number;

  /** Rotación en grados (horario). */
  @Column({ type: 'double precision', default: 0 })
  rotation: number;

  /**
   * Tamaño (px) del área de diseño CONTRA LA QUE se autoró la geometría. Lo
   * envía el editor al generar. Permite al render escalar la geometría al
   * área del mockup destino cuando difieren de tamaño (evita que el diseño se
   * desubique/encoja). Null en diseños antiguos (se infiere en el render).
   */
  @Column({ name: 'author_area_width_px', type: 'double precision', nullable: true })
  authorAreaWidthPx: number | null;

  @Column({ name: 'author_area_height_px', type: 'double precision', nullable: true })
  authorAreaHeightPx: number | null;

  /** Orden de apilado dentro del área (0-based). */
  @Column({ name: 'z_index', type: 'int', default: 0 })
  zIndex: number;
}

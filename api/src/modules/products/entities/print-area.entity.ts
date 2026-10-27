import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Product } from './product.entity';

/**
 * Área de impresión del producto: datos de catálogo (nombre comercial y
 * tamaño físico imprimible), independientes de la geometría de render del
 * PSD. Opcionalmente puede enlazar a un smart object del mockup por uuid.
 */
@Entity('print_areas')
export class PrintArea {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @ManyToOne(() => Product, (product) => product.printAreas, {
    onDelete: 'CASCADE',
    nullable: false,
  })
  @JoinColumn({ name: 'product_id' })
  product: Product;

  @Column({ name: 'product_id' })
  productId: string;

  /** Nombre del área, p.ej. "Pecho", "Espalda", "Manga izquierda". */
  @Column()
  name: string;

  /** Ancho imprimible en milímetros. */
  @Column({ name: 'width_mm', type: 'int', nullable: true })
  widthMm: number | null;

  /** Alto imprimible en milímetros. */
  @Column({ name: 'height_mm', type: 'int', nullable: true })
  heightMm: number | null;

  /** Ancho máximo imprimible en milímetros (opcional). */
  @Column({ name: 'max_width_mm', type: 'int', nullable: true })
  maxWidthMm: number | null;

  /** Alto máximo imprimible en milímetros (opcional). */
  @Column({ name: 'max_height_mm', type: 'int', nullable: true })
  maxHeightMm: number | null;

  /** Técnica de impresión sugerida, p.ej. "DTG", "Serigrafía". */
  @Column({ type: 'varchar', nullable: true })
  technique: string | null;

  /**
   * uuid del smart object del mockup al que corresponde esta área
   * (opcional; enlaza el catálogo con el render de SudoMock).
   */
  @Column({
    name: 'sudomock_smart_object_uuid',
    type: 'varchar',
    nullable: true,
  })
  sudomockSmartObjectUuid: string | null;

  /** Posición dentro del listado de áreas (0-based). */
  @Column({ type: 'int', default: 0 })
  position: number;
}

import {
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Column,
} from 'typeorm';
import { PrintArea } from './print-area.entity';

/**
 * Compatibilidad de impresión entre dos áreas de productos distintos: un
 * diseño colocado en `printArea` puede imprimirse también en
 * `compatiblePrintArea`. La relación es simétrica y se guarda en ambos
 * sentidos (A→B y B→A) para consultarla sin uniones extra.
 */
@Entity('print_area_compatibilities')
@Index(['printAreaId', 'compatiblePrintAreaId'], { unique: true })
export class PrintAreaCompatibility {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => PrintArea, { onDelete: 'CASCADE', nullable: false })
  @JoinColumn({ name: 'print_area_id' })
  printArea: PrintArea;

  @Column({ name: 'print_area_id', type: 'uuid' })
  printAreaId: string;

  @Index()
  @ManyToOne(() => PrintArea, { onDelete: 'CASCADE', nullable: false })
  @JoinColumn({ name: 'compatible_print_area_id' })
  compatiblePrintArea: PrintArea;

  @Column({ name: 'compatible_print_area_id', type: 'uuid' })
  compatiblePrintAreaId: string;
}

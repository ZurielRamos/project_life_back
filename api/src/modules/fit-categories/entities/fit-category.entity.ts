import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import type { ProductFit } from '../../products/entities/product.entity';

/**
 * Categoría administrable que pertenece a un ajuste ("fit") del catálogo.
 * El ajuste sigue siendo el enum fijo (men/women/unisex/kids/family); cada
 * ajuste tiene su propio conjunto de categorías, creadas/eliminadas desde el
 * panel. Un producto referencia una sola categoría.
 */
@Entity('fit_categories')
@Index(['fit', 'name'], { unique: true })
export class FitCategory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** Ajuste (enum fijo) al que pertenece la categoría. */
  @Column({ type: 'varchar' })
  fit: ProductFit;

  /** Nombre visible de la categoría, p.ej. "Oversize". */
  @Column()
  name: string;

  /** Orden dentro del ajuste (0-based). */
  @Column({ type: 'int', default: 0 })
  position: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

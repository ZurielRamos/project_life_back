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
 * Color disponible de un producto. `name` es el nombre comercial
 * (p.ej. "Negro", "Verde oliva") y `hex` el valor para la muestra.
 */
@Entity('product_colors')
export class ProductColor {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @ManyToOne(() => Product, (product) => product.colors, {
    onDelete: 'CASCADE',
    nullable: false,
  })
  @JoinColumn({ name: 'product_id' })
  product: Product;

  @Column({ name: 'product_id' })
  productId: string;

  /** Nombre comercial del color, p.ej. "Negro". */
  @Column()
  name: string;

  /** Color en formato hex, p.ej. "#1a1a1a". */
  @Column({ type: 'varchar', length: 9 })
  hex: string;

  /** Posición dentro del listado de colores (0-based). */
  @Column({ type: 'int', default: 0 })
  position: number;
}

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
 * Talla de un producto. `name` es el identificador corto (p.ej. "M") y
 * `labelName` el nombre que se muestra en la etiqueta (p.ej. "Mediano").
 * `measurements` guarda los valores del size chart por dimensión, usando
 * como claves los nombres definidos en `Product.sizeChartColumns`.
 */
@Entity('product_sizes')
export class ProductSize {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @ManyToOne(() => Product, (product) => product.sizes, {
    onDelete: 'CASCADE',
    nullable: false,
  })
  @JoinColumn({ name: 'product_id' })
  product: Product;

  @Column({ name: 'product_id' })
  productId: string;

  /** Identificador corto de la talla, p.ej. "XS", "M", "2XL". */
  @Column()
  name: string;

  /** Nombre para la etiqueta, p.ej. "Mediano". */
  @Column({ name: 'label_name', type: 'varchar', nullable: true })
  labelName: string | null;

  /**
   * Medidas del size chart por dimensión. Claves = Product.sizeChartColumns.
   * Ej: { "Chest": 54.5, "Sleeve": 57.2 }.
   */
  @Column({ type: 'jsonb', default: () => "'{}'" })
  measurements: Record<string, number>;

  /** Posición dentro del listado de tallas (0-based). */
  @Column({ type: 'int', default: 0 })
  position: number;
}

import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { PhotoSession } from './photo-session.entity';
import { PrintArea } from './print-area.entity';
import { ProductColor } from './product-color.entity';
import { ProductSize } from './product-size.entity';

/** Ajuste/genero del producto. */
export type ProductFit = 'men' | 'women' | 'unisex' | 'kids' | 'family';

/** Unidad de medida del size chart. */
export type MeasurementUnit = 'cm' | 'inch';

/** Información del modelo que aparece en las fotos (opcional). */
export interface ModelInfo {
  /** Texto libre, p.ej. "Man". */
  label?: string | null;
  /** Altura del modelo en cm. */
  heightCm?: number | null;
  /** Peso del modelo en kg. */
  weightKg?: number | null;
  /** Talla que usa el modelo en las fotos, p.ej. "L". */
  wearingSize?: string | null;
}

@Entity('products')
export class Product {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  // --- Atributos de catálogo ---

  @Column({ type: 'varchar', nullable: true })
  brand: string | null;

  @Column({ type: 'varchar', nullable: true })
  category: string | null;

  /** Composición de la tela, p.ej. "100% algodón". */
  @Column({ type: 'text', nullable: true })
  composition: string | null;

  /** Instrucciones de cuidado/lavado. */
  @Column({ name: 'care_instructions', type: 'text', nullable: true })
  careInstructions: string | null;

  @Column({ type: 'varchar', nullable: true })
  fit: ProductFit | null;

  /** Precio base en centavos (evita problemas de coma flotante). */
  @Column({ name: 'base_price_cents', type: 'int', nullable: true })
  basePriceCents: number | null;

  /** Código ISO de moneda, p.ej. "USD", "COP". */
  @Column({ type: 'varchar', length: 3, nullable: true })
  currency: string | null;

  // --- Size chart ---

  /** Unidad del size chart. */
  @Column({ name: 'size_chart_unit', type: 'varchar', default: 'cm' })
  sizeChartUnit: MeasurementUnit;

  /**
   * Dimensiones del size chart (columnas), p.ej. ["Chest","Sleeve","Length"].
   * Cada talla guarda sus valores en `ProductSize.measurements` por nombre.
   */
  @Column({
    name: 'size_chart_columns',
    type: 'jsonb',
    default: () => "'[]'",
  })
  sizeChartColumns: string[];

  /** Info del modelo de las fotos (opcional). */
  @Column({ name: 'model_info', type: 'jsonb', nullable: true })
  modelInfo: ModelInfo | null;

  // --- Relaciones hijas ---

  /**
   * Tallas del producto, ordenadas por `position`. `orphanedRowAction`
   * elimina las filas que se quiten al reemplazar la colección (en vez
   * de intentar poner product_id a null, que viola el NOT NULL).
   */
  @OneToMany(() => ProductSize, (size) => size.product, {
    cascade: true,
    orphanedRowAction: 'delete',
  })
  sizes: ProductSize[];

  /** Colores disponibles del producto, ordenados por `position`. */
  @OneToMany(() => ProductColor, (color) => color.product, {
    cascade: true,
    orphanedRowAction: 'delete',
  })
  colors: ProductColor[];

  /** Áreas de impresión del producto, ordenadas por `position`. */
  @OneToMany(() => PrintArea, (area) => area.product, {
    cascade: true,
    orphanedRowAction: 'delete',
  })
  printAreas: PrintArea[];

  /** Un producto tiene muchas sesiones de fotos. */
  @OneToMany(() => PhotoSession, (session) => session.product, {
    cascade: true,
  })
  photoSessions: PhotoSession[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

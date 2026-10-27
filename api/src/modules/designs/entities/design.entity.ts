import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Product } from '../../products/entities/product.entity';
import { DesignPlacement } from './design-placement.entity';
import { DesignRender } from './design-render.entity';
import { DesignSeo } from './design-seo.entity';

/**
 * Diseño creado sobre un producto. Contiene una colocación de imagen por
 * cada área de impresión que el usuario haya intervenido (DesignPlacement).
 */
/** Estado del ciclo de vida del diseño. */
export type DesignStatus = 'draft' | 'generating' | 'ready' | 'failed';

@Entity('designs')
export class Design {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  /**
   * Código público de 6 dígitos para buscar el diseño fácilmente.
   * Único. Nullable a nivel de columna para no romper synchronize con
   * filas existentes; se rellena por backfill y al crear nuevos diseños.
   */
  @Index({ unique: true })
  @Column({ type: 'varchar', length: 6, nullable: true })
  code: string | null;

  /** Estado de generación de renders/SEO. */
  @Column({ type: 'varchar', default: 'draft' })
  status: DesignStatus;

  /** Mensaje de error de la última generación fallida (si aplica). */
  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage: string | null;

  @Index()
  @ManyToOne(() => Product, { onDelete: 'CASCADE', nullable: false })
  @JoinColumn({ name: 'product_id' })
  product: Product;

  @Column({ name: 'product_id' })
  productId: string;

  /** Colocaciones de imagen, una (o varias) por área de impresión. */
  @OneToMany(() => DesignPlacement, (p) => p.design, {
    cascade: true,
    orphanedRowAction: 'delete',
  })
  placements: DesignPlacement[];

  /** Renders generados (uno por sesión×mockup×color). */
  @OneToMany(() => DesignRender, (r) => r.design, {
    cascade: true,
    orphanedRowAction: 'delete',
  })
  renders: DesignRender[];

  /** Contenido SEO generado por IA (1:1, opcional hasta generarlo). */
  @OneToOne(() => DesignSeo, (seo) => seo.design)
  seo: DesignSeo | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

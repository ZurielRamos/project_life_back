import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

/**
 * Registro de una generación de color completo por un cliente. Se usa para
 * aplicar el tope por hora configurable (max_color_generations_per_hour).
 * Una fila por cada vez que un cliente genera la sesión de un color.
 */
@Entity('custom_generations')
export class CustomGeneration {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'customer_id', type: 'uuid' })
  customerId: string;

  /** Producto y color generados (informativo). */
  @Column({ name: 'product_id', type: 'uuid' })
  productId: string;

  @Column({ name: 'color_id', type: 'uuid', nullable: true })
  colorId: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}

import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { PrintArea } from './print-area.entity';
import { Product } from './product.entity';
import { SessionMockup } from './session-mockup.entity';

/**
 * Sesión de fotos: una agrupación de mockups dentro de un producto.
 * Los mockups que contiene van ordenados (ver SessionMockup.position).
 */
@Entity('photo_sessions')
export class PhotoSession {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Index()
  @ManyToOne(() => Product, (product) => product.photoSessions, {
    onDelete: 'CASCADE',
    nullable: false,
  })
  @JoinColumn({ name: 'product_id' })
  product: Product;

  @Column({ name: 'product_id' })
  productId: string;

  /**
   * Área de impresión a la que está anclada la sesión. Es nullable y
   * usa SET NULL para que borrar un área no borre ni rompa la sesión.
   */
  @ManyToOne(() => PrintArea, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'print_area_id' })
  printArea: PrintArea | null;

  @Column({ name: 'print_area_id', type: 'uuid', nullable: true })
  printAreaId: string | null;

  /**
   * Mockups importados de SudoMock y embebidos en esta sesión, ordenados
   * por `position`. `cascade` permite guardarlos junto con la sesión.
   */
  @OneToMany(() => SessionMockup, (item) => item.photoSession, {
    cascade: true,
  })
  mockups: SessionMockup[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

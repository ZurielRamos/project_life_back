import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Design } from './design.entity';

/** Estado de un render individual. */
export type DesignRenderStatus = 'pending' | 'processing' | 'done' | 'failed';

/**
 * Un render concreto del diseño: una combinación de área de impresión,
 * sesión, mockup y color. Se agrupan por color en la UI.
 */
@Entity('design_renders')
@Index(['designId', 'colorId'])
export class DesignRender {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @ManyToOne(() => Design, (design) => design.renders, {
    onDelete: 'CASCADE',
    nullable: false,
  })
  @JoinColumn({ name: 'design_id' })
  design: Design;

  @Column({ name: 'design_id' })
  designId: string;

  // --- Qué combinación representa este render ---

  @Column({ name: 'print_area_id', type: 'uuid' })
  printAreaId: string;

  @Column({ name: 'print_area_name', type: 'varchar', nullable: true })
  printAreaName: string | null;

  @Column({ name: 'session_id', type: 'uuid' })
  sessionId: string;

  @Column({ name: 'session_name', type: 'varchar', nullable: true })
  sessionName: string | null;

  /** id local del SessionMockup usado. */
  @Column({ name: 'session_mockup_id', type: 'uuid' })
  sessionMockupId: string;

  /** uuid de la plantilla en SudoMock (para re-render). */
  @Column({ name: 'sudomock_uuid', type: 'varchar' })
  sudomockUuid: string;

  // --- Color (null si se renderizó sin color) ---

  @Column({ name: 'color_id', type: 'uuid', nullable: true })
  colorId: string | null;

  @Column({ name: 'color_name', type: 'varchar', nullable: true })
  colorName: string | null;

  @Column({ name: 'color_hex', type: 'varchar', nullable: true })
  colorHex: string | null;

  // --- Resultado ---

  @Column({ type: 'varchar', default: 'pending' })
  status: DesignRenderStatus;

  /** URL del render en Cloudinary (cuando status = done). */
  @Column({ name: 'image_url', type: 'text', nullable: true })
  imageUrl: string | null;

  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage: string | null;

  /** Posición para ordenar dentro de su grupo de color. */
  @Column({ type: 'int', default: 0 })
  position: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

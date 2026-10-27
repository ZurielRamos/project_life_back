import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import type { SmartObject, TextLayer } from 'sudomock';
import { PhotoSession } from './photo-session.entity';

/**
 * Mockup importado desde SudoMock, embebido dentro de una sesión de fotos.
 *
 * A diferencia del diseño anterior, NO es una entidad global reutilizable:
 * cada sesión guarda su propia copia de los datos del PSD. Si el mismo
 * PSD se usa en dos sesiones/productos, hay dos filas independientes.
 *
 * Los datos de SudoMock (smartObjects, textLayers) se guardan como JSONB
 * para preservar su estructura y poder usarlos luego al renderizar.
 */
@Entity('session_mockups')
export class SessionMockup {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @ManyToOne(() => PhotoSession, (session) => session.mockups, {
    onDelete: 'CASCADE',
    nullable: false,
  })
  @JoinColumn({ name: 'photo_session_id' })
  photoSession: PhotoSession;

  @Column({ name: 'photo_session_id' })
  photoSessionId: string;

  /** uuid de la plantilla en SudoMock. */
  @Column({ name: 'sudomock_uuid' })
  sudomockUuid: string;

  /**
   * Cuenta de SudoMock (alias) desde la que se importó. Necesario para
   * re-renderizar luego con la API key correcta cuando hay varias cuentas.
   * Default 'default' para respaldar los registros creados con la única
   * cuenta previa.
   */
  @Column({ name: 'sudomock_account_id', type: 'varchar', default: 'default' })
  sudomockAccountId: string;

  /** Nombre original de la plantilla en SudoMock. */
  @Column({ name: 'sudomock_name', type: 'varchar', nullable: true })
  sudomockName: string | null;

  @Column({ name: 'thumbnail_url', type: 'text', nullable: true })
  thumbnailUrl: string | null;

  @Column({ type: 'int', nullable: true })
  width: number | null;

  @Column({ type: 'int', nullable: true })
  height: number | null;

  /** Smart objects de la plantilla (sus uuid se usan al renderizar). */
  @Column({ name: 'smart_objects', type: 'jsonb', default: () => "'[]'" })
  smartObjects: SmartObject[];

  /** Capas de texto editables de la plantilla. */
  @Column({ name: 'text_layers', type: 'jsonb', default: () => "'[]'" })
  textLayers: TextLayer[];

  /** Copia íntegra de la respuesta de SudoMock. */
  @Column({ type: 'jsonb', nullable: true })
  raw: Record<string, unknown> | null;

  /** Posición del mockup dentro de la sesión (0-based). */
  @Column({ type: 'int', default: 0 })
  position: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}

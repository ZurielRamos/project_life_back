import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Role } from '../../roles/entities/role.entity';

/**
 * Unidad atómica de autorización.
 * El `name` sigue el formato "recurso:accion" (ej. "users:create").
 * Agregar una nueva capacidad al sistema es tan simple como insertar
 * una nueva fila aquí; no requiere cambios en los guards.
 */
@Entity('permissions')
export class Permission {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** Identificador legible y único, formato "recurso:accion". */
  @Column({ unique: true })
  name: string;

  /** Recurso sobre el que aplica el permiso (ej. "users"). */
  @Column()
  resource: string;

  /** Acción permitida sobre el recurso (ej. "create"). */
  @Column()
  action: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @ManyToMany(() => Role, (role) => role.permissions)
  roles: Role[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

import {
  Column,
  Entity,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';

/**
 * Ajustes de la generación "crea tu propia camiseta". Tabla de una sola fila
 * (id fijo = 'default'), editable desde el panel de administración.
 */
@Entity('generation_settings')
export class GenerationSettings {
  /** id fijo: siempre hay una única fila 'default'. */
  @PrimaryColumn({ type: 'varchar', default: 'default' })
  id: string;

  /**
   * Máximo de generaciones de color completo por cliente por hora. Cada
   * "generación de color" renderiza toda la sesión (varios mockups) de un
   * color. 0 = sin límite.
   */
  @Column({ name: 'max_color_generations_per_hour', type: 'int', default: 10 })
  maxColorGenerationsPerHour: number;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

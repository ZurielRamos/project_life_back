import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

/**
 * Ajuste administrable del catálogo (Hombre, Mujer, Unisex, ...).
 * `key` es el identificador estable (slug) que guardan `products.fit` y
 * `fit_categories.fit`; `name` es el texto visible y se puede cambiar sin
 * afectar a los productos.
 */
@Entity('fits')
export class Fit {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** Slug único, p.ej. "men". Inmutable una vez creado. */
  @Column({ type: 'varchar', unique: true })
  key: string;

  /** Nombre visible, p.ej. "Hombre". */
  @Column({ type: 'varchar' })
  name: string;

  @Column({ type: 'int', default: 0 })
  position: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

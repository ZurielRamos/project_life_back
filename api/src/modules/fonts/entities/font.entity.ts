import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

/**
 * Tipografía registrada para usar en plantillas SVG. La `family` debe
 * coincidir con la `font-family` que usan los `<text>` del SVG; con ella
 * resolvemos el archivo (buffer) al rasterizar con resvg.
 */
@Entity('fonts')
export class Font {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** Nombre de la familia tipográfica, p.ej. "Poppins". Único. */
  @Index({ unique: true })
  @Column({ type: 'varchar' })
  family: string;

  /** URL del archivo de fuente en Cloudinary (resource_type raw). */
  @Column({ name: 'file_url', type: 'text' })
  fileUrl: string;

  /** publicId del archivo en Cloudinary (para borrarlo). */
  @Column({ name: 'file_public_id', type: 'varchar' })
  filePublicId: string;

  /** Formato del archivo, p.ej. "ttf", "woff2". */
  @Column({ type: 'varchar', nullable: true })
  format: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

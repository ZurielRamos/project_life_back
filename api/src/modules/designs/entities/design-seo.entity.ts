import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Design } from './design.entity';

/**
 * Contenido SEO generado por IA para un diseño (relación 1:1). Se separa
 * del Design para mantener la entidad núcleo limpia y agrupar lo generado.
 *
 * `embedding` es un vector pgvector(1536) de la descripción, usado para
 * búsqueda semántica. TypeORM no gestiona ese tipo: la columna se crea
 * por SQL (migración/synchronize manual) y se escribe/lee con queries
 * crudas, por eso aquí va con insert/update/select en false.
 */
@Entity('design_seo')
export class DesignSeo {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @OneToOne(() => Design, (design) => design.seo, {
    onDelete: 'CASCADE',
    nullable: false,
  })
  @JoinColumn({ name: 'design_id' })
  design: Design;

  @Column({ name: 'design_id', unique: true })
  designId: string;

  @Column()
  title: string;

  @Column()
  slug: string;

  @Column({ name: 'meta_title', type: 'varchar', nullable: true })
  metaTitle: string | null;

  @Column({ name: 'meta_description', type: 'text', nullable: true })
  metaDescription: string | null;

  /** Descripción larga enfocada en SEO (fuente del embedding). */
  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'jsonb', default: () => "'[]'" })
  keywords: string[];

  /** Datos estructurados schema.org (JSON-LD de Product). */
  @Column({ name: 'json_ld', type: 'jsonb', nullable: true })
  jsonLd: Record<string, unknown> | null;

  /** Metadatos Open Graph / Twitter Card para compartir y crawlers. */
  @Column({ name: 'open_graph', type: 'jsonb', nullable: true })
  openGraph: Record<string, unknown> | null;

  // NOTA: la columna `embedding vector(1536)` NO se declara aquí a propósito.
  // TypeORM no soporta el tipo `vector` y, con synchronize activo, intentaría
  // alterarla. Se crea/gestiona por SQL crudo (ALTER TABLE ... vector(1536))
  // y se lee/escribe con queries parametrizadas (<=> y ::vector).

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

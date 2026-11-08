import {
  Column,
  CreateDateColumn,
  Entity,
  JoinTable,
  ManyToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Design } from '../../designs/entities/design.entity';
import { Product } from '../../products/entities/product.entity';

/** Redes sociales de la tienda (todas opcionales). */
export interface StoreSocialLinks {
  instagram?: string;
  facebook?: string;
  tiktok?: string;
  x?: string;
  youtube?: string;
  pinterest?: string;
  whatsapp?: string;
}

/**
 * Tienda ecommerce configurable. Cada tienda tiene su propia información
 * (títulos, contacto, redes, SEO), su dominio, y define qué productos
 * vende y qué diseños publica.
 */
@Entity('stores')
export class Store {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** Nombre interno (para el admin). */
  @Column()
  name: string;

  /** Identificador estable en URL; único. */
  @Column({ unique: true })
  slug: string;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  /** Muestra el botón «Crea tu propia camiseta» en la ficha de producto. */
  @Column({ name: 'custom_designer_enabled', default: true })
  customDesignerEnabled: boolean;

  // --- Información pública ---

  /** Título visible de la tienda (cabecera / pestaña). */
  @Column({ type: 'varchar', nullable: true })
  title: string | null;

  @Column({ type: 'varchar', nullable: true })
  tagline: string | null;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ name: 'logo_url', type: 'text', nullable: true })
  logoUrl: string | null;

  @Column({ name: 'favicon_url', type: 'text', nullable: true })
  faviconUrl: string | null;

  /** Color de marca en hex (#RRGGBB). */
  @Column({ name: 'primary_color', type: 'varchar', nullable: true })
  primaryColor: string | null;

  /** Segundo color de marca en hex (#RRGGBB): final de los degradados. */
  @Column({ name: 'secondary_color', type: 'varchar', nullable: true })
  secondaryColor: string | null;

  // --- Contacto ---

  @Column({ name: 'contact_email', type: 'varchar', nullable: true })
  contactEmail: string | null;

  @Column({ type: 'varchar', nullable: true })
  phone: string | null;

  @Column({ type: 'text', nullable: true })
  address: string | null;

  @Column({ name: 'social_links', type: 'jsonb', default: () => "'{}'" })
  socialLinks: StoreSocialLinks;

  // --- Regionalización ---

  @Column({ default: 'USD' })
  currency: string;

  @Column({ default: 'es' })
  locale: string;

  // --- SEO ---

  @Column({ name: 'seo_title', type: 'varchar', nullable: true })
  seoTitle: string | null;

  @Column({ name: 'seo_description', type: 'text', nullable: true })
  seoDescription: string | null;

  // --- Dominio ---

  /**
   * @deprecated Reemplazado por la tabla `store_domains` (varios dominios por
   * tienda). Se conserva solo para migrar valores antiguos al arrancar.
   */
  @Column({ type: 'varchar', unique: true, nullable: true })
  domain: string | null;

  // --- Sitio web ---

  /**
   * Configuración del sitio (anuncio, header, footer, home, contacto, páginas,
   * integraciones). Solo guarda las secciones editadas; ver site-config.ts.
   */
  @Column({ name: 'site_config', type: 'jsonb', default: () => "'{}'" })
  siteConfig: Record<string, unknown>;

  // --- Catálogo ---

  @ManyToMany(() => Product)
  @JoinTable({
    name: 'store_products',
    joinColumn: { name: 'store_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'product_id', referencedColumnName: 'id' },
  })
  products: Product[];

  @ManyToMany(() => Design)
  @JoinTable({
    name: 'store_designs',
    joinColumn: { name: 'store_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'design_id', referencedColumnName: 'id' },
  })
  designs: Design[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

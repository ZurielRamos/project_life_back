import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import { Design } from '../designs/entities/design.entity';
import { Product } from '../products/entities/product.entity';
import { CreateStoreDto } from './dto/create-store.dto';
import { UpdateStoreDto } from './dto/update-store.dto';
import { Store } from './entities/store.entity';
import { RESERVED_STORE_SLUGS } from './reserved-slugs';

/** Tienda sin relaciones pesadas: solo los ids del catálogo asignado. */
export type StoreView = Omit<Store, 'products' | 'designs'> & {
  productIds: string[];
  designIds: string[];
  /** URL pública por subdominio (null si no hay STORES_BASE_DOMAIN). */
  publicUrl: string | null;
};

/** Fila de listado: tienda con contadores. */
export type StoreSummary = Omit<Store, 'products' | 'designs'> & {
  productCount: number;
  designCount: number;
  publicUrl: string | null;
};

/** Datos de una tienda que se exponen públicamente (sin campos internos). */
export interface PublicStore {
  slug: string;
  name: string;
  title: string | null;
  tagline: string | null;
  description: string | null;
  logoUrl: string | null;
  faviconUrl: string | null;
  primaryColor: string | null;
  contactEmail: string | null;
  phone: string | null;
  address: string | null;
  socialLinks: Store['socialLinks'];
  currency: string;
  locale: string;
  seoTitle: string | null;
  seoDescription: string | null;
  publicUrl: string | null;
}

@Injectable()
export class StoresService {
  constructor(
    @InjectRepository(Store)
    private readonly storesRepository: Repository<Store>,
    @InjectRepository(Product)
    private readonly productsRepository: Repository<Product>,
    @InjectRepository(Design)
    private readonly designsRepository: Repository<Design>,
    private readonly dataSource: DataSource,
    private readonly config: ConfigService,
  ) {}

  /** Dominio base de las tiendas (ej. "inkttex.com"), en minúsculas. */
  private get baseDomain(): string | null {
    const value = this.config.get<string>('STORES_BASE_DOMAIN');
    return value ? value.trim().toLowerCase() : null;
  }

  private publicUrlFor(slug: string): string | null {
    return this.baseDomain ? `https://${slug}.${this.baseDomain}` : null;
  }

  async create(dto: CreateStoreDto): Promise<StoreView> {
    const slug = dto.slug.trim().toLowerCase();
    this.assertSlugAllowed(slug);
    const domain = this.normalizeDomain(dto.domain);
    await this.assertUnique(slug, domain);

    const store = this.storesRepository.create({
      ...this.pickFields(dto),
      slug,
      domain,
      products: await this.resolveProducts(dto.productIds),
      designs: await this.resolveDesigns(dto.designIds),
    });
    const saved = await this.storesRepository.save(store);
    return this.findOne(saved.id);
  }

  async findAll(): Promise<StoreSummary[]> {
    const rows = await this.storesRepository
      .createQueryBuilder('store')
      .loadRelationCountAndMap('store.productCount', 'store.products')
      .loadRelationCountAndMap('store.designCount', 'store.designs')
      .orderBy('store.createdAt', 'DESC')
      .getMany();
    return (rows as unknown as StoreSummary[]).map((row) => ({
      ...row,
      publicUrl: this.publicUrlFor(row.slug),
    }));
  }

  async findOne(id: string): Promise<StoreView> {
    const store = await this.storesRepository.findOne({
      where: { id },
      relations: { products: true, designs: true },
      select: {
        products: { id: true },
        designs: { id: true },
      },
    });
    if (!store) {
      throw new NotFoundException('Tienda no encontrada');
    }
    const { products, designs, ...rest } = store;
    return {
      ...rest,
      productIds: products.map((p) => p.id),
      designIds: designs.map((d) => d.id),
      publicUrl: this.publicUrlFor(rest.slug),
    };
  }

  async update(id: string, dto: UpdateStoreDto): Promise<StoreView> {
    const store = await this.storesRepository.findOne({ where: { id } });
    if (!store) {
      throw new NotFoundException('Tienda no encontrada');
    }

    const slug =
      dto.slug !== undefined ? dto.slug.trim().toLowerCase() : undefined;
    if (slug !== undefined && slug !== store.slug) {
      this.assertSlugAllowed(slug);
    }
    const domain =
      dto.domain !== undefined ? this.normalizeDomain(dto.domain) : undefined;
    await this.assertUnique(
      slug !== undefined && slug !== store.slug ? slug : undefined,
      domain !== undefined && domain !== store.domain ? domain : undefined,
      id,
    );

    Object.assign(store, this.pickFields(dto));
    if (slug !== undefined) store.slug = slug;
    if (domain !== undefined) store.domain = domain;
    if (dto.productIds !== undefined) {
      store.products = await this.resolveProducts(dto.productIds);
    }
    if (dto.designIds !== undefined) {
      store.designs = await this.resolveDesigns(dto.designIds);
    }
    await this.storesRepository.save(store);
    return this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    const result = await this.storesRepository.delete(id);
    if (!result.affected) {
      throw new NotFoundException('Tienda no encontrada');
    }
  }

  /** Configuración que necesita el admin para mostrar el subdominio. */
  getConfig(): { baseDomain: string | null } {
    return { baseDomain: this.baseDomain };
  }

  /**
   * Indica si un subdominio se puede usar. `storeId` excluye a la propia
   * tienda (para que su subdominio actual cuente como disponible).
   */
  async checkSubdomain(
    raw: string,
    storeId?: string,
  ): Promise<{ available: boolean; message: string | null }> {
    const subdomain = (raw ?? '').trim().toLowerCase();
    if (subdomain.length < 2 || subdomain.length > 60) {
      return {
        available: false,
        message: 'Debe tener entre 2 y 60 caracteres',
      };
    }
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(subdomain)) {
      return {
        available: false,
        message:
          'Solo minúsculas, números y guiones (sin guiones al inicio o final)',
      };
    }
    if (RESERVED_STORE_SLUGS.has(subdomain)) {
      return { available: false, message: 'Este subdominio está reservado' };
    }
    const found = await this.storesRepository.findOne({
      where: { slug: subdomain },
      select: { id: true },
    });
    if (found && found.id !== storeId) {
      return { available: false, message: 'Este subdominio ya está en uso' };
    }
    return { available: true, message: null };
  }

  // --- Resolución pública (storefront) ---

  /**
   * Resuelve una tienda ACTIVA a partir del host de la petición: primero por
   * dominio propio exacto y luego por subdominio del dominio base
   * (<slug>.<dominio base>). Devuelve null si no hay coincidencia.
   */
  async findPublicByHost(rawHost: string): Promise<PublicStore | null> {
    const host = rawHost.trim().toLowerCase().replace(/:\d+$/, '');
    if (!host) return null;

    let store = await this.storesRepository.findOne({
      where: { domain: host, isActive: true },
    });

    const base = this.baseDomain;
    if (!store && base && host.endsWith(`.${base}`)) {
      const slug = host.slice(0, -(base.length + 1));
      // Solo un nivel de subdominio (sin puntos).
      if (slug && !slug.includes('.') && !RESERVED_STORE_SLUGS.has(slug)) {
        store = await this.storesRepository.findOne({
          where: { slug, isActive: true },
        });
      }
    }
    return store ? this.toPublic(store) : null;
  }

  /** Tienda activa por slug (para filtrar el catálogo público). */
  async findActiveBySlug(slug: string): Promise<Store | null> {
    return this.storesRepository.findOne({
      where: { slug: slug.trim().toLowerCase(), isActive: true },
    });
  }

  /**
   * Ids de diseños visibles en la tienda: los publicados en ella cuyo
   * producto base también está publicado en la misma tienda.
   */
  async getVisibleDesignIds(storeId: string): Promise<string[]> {
    const rows: { design_id: string }[] = await this.dataSource.query(
      `SELECT sd.design_id
         FROM store_designs sd
         JOIN designs d ON d.id = sd.design_id
         JOIN store_products sp
           ON sp.store_id = sd.store_id AND sp.product_id = d.product_id
        WHERE sd.store_id = $1`,
      [storeId],
    );
    return rows.map((r) => r.design_id);
  }

  private toPublic(store: Store): PublicStore {
    return {
      slug: store.slug,
      name: store.name,
      title: store.title,
      tagline: store.tagline,
      description: store.description,
      logoUrl: store.logoUrl,
      faviconUrl: store.faviconUrl,
      primaryColor: store.primaryColor,
      contactEmail: store.contactEmail,
      phone: store.phone,
      address: store.address,
      socialLinks: store.socialLinks,
      currency: store.currency,
      locale: store.locale,
      seoTitle: store.seoTitle,
      seoDescription: store.seoDescription,
      publicUrl: this.publicUrlFor(store.slug),
    };
  }

  // --- helpers ---

  private assertSlugAllowed(slug: string): void {
    if (RESERVED_STORE_SLUGS.has(slug)) {
      throw new BadRequestException(
        `El subdominio "${slug}" está reservado; elige otro`,
      );
    }
  }

  /** Campos escalares editables (excluye slug/domain/relaciones). */
  private pickFields(dto: UpdateStoreDto): Partial<Store> {
    const out: Partial<Store> = {};
    const nullable = [
      'title',
      'tagline',
      'description',
      'logoUrl',
      'faviconUrl',
      'primaryColor',
      'contactEmail',
      'phone',
      'address',
      'seoTitle',
      'seoDescription',
    ] as const;
    for (const key of nullable) {
      if (dto[key] !== undefined) {
        // Cadena vacía = limpiar el campo.
        out[key] = dto[key]!.trim() || null;
      }
    }
    if (dto.name !== undefined) out.name = dto.name.trim();
    if (dto.isActive !== undefined) out.isActive = dto.isActive;
    if (dto.currency !== undefined) out.currency = dto.currency.toUpperCase();
    if (dto.locale !== undefined) out.locale = dto.locale.trim();
    if (dto.socialLinks !== undefined) {
      // Se reemplaza completo; se descartan los vacíos.
      out.socialLinks = Object.fromEntries(
        Object.entries(dto.socialLinks)
          .map(([k, v]) => [k, typeof v === 'string' ? v.trim() : v])
          .filter(([, v]) => v),
      );
    }
    return out;
  }

  /** Normaliza a host en minúsculas sin protocolo, ruta ni puerto. */
  private normalizeDomain(raw: string | undefined): string | null {
    const value = (raw ?? '')
      .trim()
      .toLowerCase()
      .replace(/^https?:\/\//, '')
      .replace(/\/.*$/, '');
    if (!value) return null;
    const valid =
      /^(?=.{1,253}$)([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/.test(
        value,
      );
    if (!valid) {
      throw new BadRequestException('El dominio no es válido');
    }
    return value;
  }

  private async assertUnique(
    slug: string | undefined,
    domain: string | null | undefined,
    excludeId?: string,
  ): Promise<void> {
    if (slug) {
      const found = await this.storesRepository.findOne({ where: { slug } });
      if (found && found.id !== excludeId) {
        throw new BadRequestException(
          'Ese subdominio ya está en uso por otra tienda',
        );
      }
    }
    if (domain) {
      const found = await this.storesRepository.findOne({ where: { domain } });
      if (found && found.id !== excludeId) {
        throw new BadRequestException(
          'Ese dominio ya está asignado a otra tienda',
        );
      }
    }
  }

  private async resolveProducts(ids?: string[]): Promise<Product[]> {
    if (!ids?.length) return [];
    const found = await this.productsRepository.find({
      where: { id: In(ids) },
      select: { id: true },
    });
    if (found.length !== ids.length) {
      throw new BadRequestException('Algún producto no existe');
    }
    return found;
  }

  private async resolveDesigns(ids?: string[]): Promise<Design[]> {
    if (!ids?.length) return [];
    const found = await this.designsRepository.find({
      where: { id: In(ids) },
      select: { id: true },
    });
    if (found.length !== ids.length) {
      throw new BadRequestException('Algún diseño no existe');
    }
    return found;
  }
}

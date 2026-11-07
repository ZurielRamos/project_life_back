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
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { CreateStoreDto } from './dto/create-store.dto';
import { UpdateStoreDto } from './dto/update-store.dto';
import { Store } from './entities/store.entity';
import { RESERVED_STORE_SLUGS } from './reserved-slugs';
import {
  mergeSiteConfig,
  resolveSiteConfig,
  type SiteConfig,
} from './site-config';
import { StoreDomainsService } from './store-domains.service';

/** Tienda sin relaciones pesadas: solo los ids del catálogo asignado. */
export type StoreView = Omit<Store, 'products' | 'designs' | 'siteConfig'> & {
  /** Configuración del sitio ya resuelta (con valores por defecto). */
  siteConfig: SiteConfig;
  productIds: string[];
  designIds: string[];
  /** URL pública por subdominio (null si no hay STORES_BASE_DOMAIN). */
  publicUrl: string | null;
};

/** Fila de listado: tienda con contadores. */
export type StoreSummary = Omit<
  Store,
  'products' | 'designs' | 'siteConfig'
> & {
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
  /** Configuración del sitio (apariencia y contenido) ya resuelta. */
  site: SiteConfig;
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
    private readonly domainsService: StoreDomainsService,
    private readonly cloudinary: CloudinaryService,
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
    await this.assertUnique(slug);

    const store = this.storesRepository.create({
      ...this.pickFields(dto),
      slug,
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
    return rows.map((row) => {
      // La configuración del sitio es pesada y no se necesita en el listado.
      const { siteConfig: _siteConfig, ...rest } = row;
      return {
        ...rest,
        publicUrl: this.publicUrlFor(row.slug),
      } as unknown as StoreSummary;
    });
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
    const { products, designs, siteConfig, ...rest } = store;
    return {
      ...rest,
      siteConfig: resolveSiteConfig(siteConfig),
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
    await this.assertUnique(
      slug !== undefined && slug !== store.slug ? slug : undefined,
      id,
    );

    Object.assign(store, this.pickFields(dto));
    if (slug !== undefined) store.slug = slug;
    if (dto.siteConfig !== undefined) {
      store.siteConfig = mergeSiteConfig(store.siteConfig, dto.siteConfig);
    }
    if (dto.productIds !== undefined) {
      store.products = await this.resolveProducts(dto.productIds);
    }
    if (dto.designIds !== undefined) {
      store.designs = await this.resolveDesigns(dto.designIds);
    } else if (dto.productIds !== undefined) {
      // Al cambiar los productos, se quitan los diseños de los productos que
      // ya no están publicados en la tienda.
      store.designs = await this.resolveDesigns(
        await this.designIdsOfProducts(id, dto.productIds),
      );
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

    // Dominio propio activo: resuelto desde la caché en memoria (sin BD).
    const domainStoreId = this.domainsService.storeIdForHost(host);
    let store = domainStoreId
      ? await this.storesRepository.findOne({
          where: { id: domainStoreId, isActive: true },
        })
      : null;

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

  /**
   * Configuración pública de una tienda ACTIVA por slug. Lo usa el front en
   * entornos sin dominio de tienda (desarrollo, previews).
   */
  async findPublicBySlug(slug: string): Promise<PublicStore | null> {
    const store = await this.findActiveBySlug(slug);
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
      site: resolveSiteConfig(store.siteConfig),
    };
  }

  /** Sube una imagen del sitio a Cloudinary y devuelve su URL. */
  async uploadAsset(
    storeId: string,
    dataUri: string,
  ): Promise<{ url: string; width: number; height: number }> {
    const exists = await this.storesRepository.exist({
      where: { id: storeId },
    });
    if (!exists) {
      throw new NotFoundException('Tienda no encontrada');
    }
    const uploaded = await this.cloudinary.uploadImageData(dataUri, {
      folder: `kult/stores/${storeId}`,
    });
    return {
      url: uploaded.url,
      width: uploaded.width,
      height: uploaded.height,
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

  private async assertUnique(
    slug: string | undefined,
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

  /** Ids de los diseños de la tienda cuyo producto está en `productIds`. */
  private async designIdsOfProducts(
    storeId: string,
    productIds: string[],
  ): Promise<string[]> {
    const allowed = new Set(productIds);
    const rows: { design_id: string; product_id: string }[] =
      await this.dataSource.query(
        `SELECT sd.design_id, d.product_id
           FROM store_designs sd
           JOIN designs d ON d.id = sd.design_id
          WHERE sd.store_id = $1`,
        [storeId],
      );
    return rows
      .filter((r) => allowed.has(r.product_id))
      .map((r) => r.design_id);
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

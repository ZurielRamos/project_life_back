import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import { AiService } from '../ai/ai.service';
import { Design } from '../designs/entities/design.entity';
import type { ProductFit } from '../products/entities/product.entity';
import { ListStorefrontDesignsDto } from './dto/list-storefront-designs.dto';
import { SearchStorefrontDesignsDto } from './dto/search-storefront-designs.dto';

/** Un color del producto con todas sus imágenes (renders). */
export interface StorefrontColor {
  id: string | null;
  name: string | null;
  hex: string | null;
  /** Todas las imágenes renderizadas de este color, ordenadas. */
  images: string[];
}

/** Talla disponible del producto. */
export interface StorefrontSize {
  name: string;
  label: string | null;
}

/** Producto de tienda derivado de un diseño listo. */
export interface StorefrontProduct {
  id: string;
  /** Código público de 6 dígitos para búsqueda. */
  code: string | null;
  name: string;
  slug: string | null;
  description: string | null;
  fit: ProductFit | null;
  category: string | null;
  priceCents: number | null;
  currency: string | null;
  /** Portada: primera imagen del color principal. */
  cover: string | null;
  /** Colores disponibles, cada uno con su lista de imágenes. */
  colors: StorefrontColor[];
  /** Tallas disponibles (solo en el detalle). */
  sizes: StorefrontSize[];
  /** Composición de la tela (solo en el detalle). */
  composition: string | null;
  /** Instrucciones de cuidado (solo en el detalle). */
  careInstructions: string | null;
  createdAt: string;
}

/** Respuesta paginada de la tienda. */
export interface StorefrontListResult {
  items: StorefrontProduct[];
  total: number;
  limit: number;
  offset: number;
}

@Injectable()
export class StorefrontService {
  constructor(
    @InjectRepository(Design)
    private readonly designsRepository: Repository<Design>,
    private readonly dataSource: DataSource,
    private readonly aiService: AiService,
  ) {}

  /**
   * Búsqueda SEMÁNTICA pública de diseños. Embebe la consulta con el mismo
   * modelo usado al indexar y ordena por distancia coseno (pgvector) contra
   * los embeddings guardados en `design_embeddings`. Solo devuelve diseños
   * publicados (status 'ready') y con al menos una imagen lista.
   *
   * Resiliente: si el embedding falla (p. ej. sin API key o red caída), cae
   * a la búsqueda por texto (ILIKE) para no dejar al usuario sin resultados.
   */
  async search(
    query: SearchStorefrontDesignsDto,
  ): Promise<StorefrontListResult> {
    const limit = query.limit ?? 24;
    const offset = query.offset ?? 0;
    const q = (query.q ?? '').trim();

    if (!q) {
      return { items: [], total: 0, limit, offset };
    }

    let embedding: number[] | null = null;
    try {
      embedding = await this.aiService.embed(q);
    } catch {
      embedding = null;
    }

    // Fallback a texto si no pudimos generar el vector.
    if (!embedding) {
      return this.listDesigns({ q, limit, offset });
    }

    const literal = `[${embedding.join(',')}]`;

    // ids de diseños ordenados por similitud (menor distancia coseno primero).
    const rows: { design_id: string }[] = await this.dataSource.query(
      `SELECT de.design_id
         FROM design_embeddings de
         JOIN designs d ON d.id = de.design_id
        WHERE de.embedding IS NOT NULL
          AND d.status = 'ready'
        ORDER BY de.embedding <=> $1::vector
        LIMIT $2`,
      [literal, limit + offset + 50],
    );

    const orderedIds = rows.map((r) => r.design_id);
    if (orderedIds.length === 0) {
      // Sin vecinos: intentamos texto como último recurso.
      return this.listDesigns({ q, limit, offset });
    }

    // Cargamos los diseños y preservamos el orden de similitud.
    const designs = await this.designsRepository.find({
      where: { id: In(orderedIds), status: 'ready' },
      relations: { product: true, seo: true, renders: true },
    });
    const byId = new Map(designs.map((d) => [d.id, d]));

    const mapped = orderedIds
      .map((id) => byId.get(id))
      .filter((d): d is Design => !!d)
      .map((d) => this.toStorefrontProduct(d))
      // Solo productos con portada (imagen lista).
      .filter((p) => p.cover !== null);

    return {
      items: mapped.slice(offset, offset + limit),
      total: mapped.length,
      limit,
      offset,
    };
  }

  /**
   * Lista diseños publicables (status 'ready') como productos de tienda,
   * filtrando por género (fit), categoría y texto. Público, sin auth.
   */
  async listDesigns(
    query: ListStorefrontDesignsDto,
  ): Promise<StorefrontListResult> {
    const limit = query.limit ?? 24;
    const offset = query.offset ?? 0;

    const qb = this.designsRepository
      .createQueryBuilder('design')
      .leftJoinAndSelect('design.product', 'product')
      .leftJoinAndSelect('design.seo', 'seo')
      .leftJoinAndSelect(
        'design.renders',
        'render',
        'render.status = :done',
        { done: 'done' },
      )
      .where('design.status = :ready', { ready: 'ready' });

    if (query.fit) {
      qb.andWhere('product.fit = :fit', { fit: query.fit });
    }
    if (query.category) {
      qb.andWhere('LOWER(product.category) = LOWER(:category)', {
        category: query.category,
      });
    }
    if (query.q) {
      qb.andWhere(
        '(design.name ILIKE :q OR product.name ILIKE :q OR design.code = :code)',
        { q: `%${query.q}%`, code: query.q.trim() },
      );
    }

    qb.orderBy('design.created_at', 'DESC');

    const designs = await qb.getMany();
    const mapped = designs.map((d) => this.toStorefrontProduct(d));

    // Solo productos con al menos una imagen lista.
    const withImage = mapped.filter((p) => p.cover !== null);

    return {
      items: withImage.slice(offset, offset + limit),
      total: withImage.length,
      limit,
      offset,
    };
  }

  /** Detalle de un producto de tienda por slug SEO. */
  async getBySlug(slug: string): Promise<StorefrontProduct> {
    const design = await this.designsRepository
      .createQueryBuilder('design')
      .leftJoinAndSelect('design.product', 'product')
      .leftJoinAndSelect('product.sizes', 'size')
      .leftJoinAndSelect('design.seo', 'seo')
      .leftJoinAndSelect('design.renders', 'render', 'render.status = :done', {
        done: 'done',
      })
      .where('seo.slug = :slug', { slug })
      .andWhere('design.status = :ready', { ready: 'ready' })
      .getOne();

    if (!design) {
      throw new NotFoundException('Producto no encontrado');
    }
    return this.toStorefrontProduct(design);
  }

  private toStorefrontProduct(design: Design): StorefrontProduct {
    const product = design.product ?? null;
    const renders = (design.renders ?? [])
      .filter((r) => r.status === 'done' && r.imageUrl)
      .sort((a, b) => a.position - b.position);

    // Agrupar renders por color, preservando el orden de aparición.
    // Cada color conserva TODAS sus imágenes (varios renders por color).
    const byColor = new Map<string, StorefrontColor>();
    for (const r of renders) {
      const key = r.colorId ?? `__nocolor__${r.colorHex ?? r.colorName ?? ''}`;
      let color = byColor.get(key);
      if (!color) {
        color = {
          id: r.colorId,
          name: r.colorName,
          hex: r.colorHex,
          images: [],
        };
        byColor.set(key, color);
      }
      color.images.push(r.imageUrl as string);
    }

    const colors = [...byColor.values()];
    const cover = colors[0]?.images[0] ?? null;

    // Tallas (solo vienen cargadas en el detalle via getBySlug).
    const sizes: StorefrontSize[] = (product?.sizes ?? [])
      .slice()
      .sort((a, b) => a.position - b.position)
      .map((s) => ({ name: s.name, label: s.labelName }));

    return {
      id: design.id,
      code: design.code ?? null,
      name: design.seo?.title ?? design.name,
      slug: design.seo?.slug ?? null,
      description: design.seo?.metaDescription ?? design.seo?.description ?? null,
      fit: product?.fit ?? null,
      category: product?.category ?? null,
      priceCents: product?.basePriceCents ?? null,
      currency: product?.currency ?? null,
      cover,
      colors,
      sizes,
      composition: product?.composition ?? null,
      careInstructions: product?.careInstructions ?? null,
      createdAt:
        design.createdAt instanceof Date
          ? design.createdAt.toISOString()
          : String(design.createdAt),
    };
  }
}

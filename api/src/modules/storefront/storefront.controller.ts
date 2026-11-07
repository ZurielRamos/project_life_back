import {
  BadRequestException,
  Controller,
  Get,
  NotFoundException,
  Param,
  Query,
} from '@nestjs/common';
import { Public } from '../auth/decorators/public.decorator';
import { ListStorefrontDesignsDto } from './dto/list-storefront-designs.dto';
import { SearchStorefrontDesignsDto } from './dto/search-storefront-designs.dto';
import { StoresService } from '../stores/stores.service';
import {
  StorefrontListResult,
  StorefrontProduct,
  StorefrontService,
} from './storefront.service';

/**
 * API pública de la tienda. No requiere autenticación: expone únicamente
 * diseños ya publicados (status 'ready') como productos listos para
 * mostrar en el storefront.
 */
@Public()
@Controller('storefront')
export class StorefrontController {
  constructor(
    private readonly storefrontService: StorefrontService,
    private readonly storesService: StoresService,
  ) {}

  /**
   * Resuelve la tienda a partir del host de la petición (subdominio del
   * dominio base o dominio propio). El front lo llama con el `Host` que
   * recibió. Como alternativa para desarrollo y previews acepta `slug`.
   * Solo expone configuración pública de tiendas activas.
   */
  @Get('store')
  async getStoreByHost(
    @Query('host') host?: string,
    @Query('slug') slug?: string,
  ) {
    if (!host?.trim() && !slug?.trim()) {
      throw new BadRequestException('Falta el parámetro host o slug');
    }
    const store = host?.trim()
      ? await this.storesService.findPublicByHost(host)
      : await this.storesService.findPublicBySlug(slug as string);
    if (!store) {
      throw new NotFoundException('Tienda no encontrada');
    }
    return store;
  }

  /**
   * Lista productos (diseños listos) con filtro opcional por género (fit:
   * men/women/unisex/kids), categoría y texto. Paginado con limit/offset.
   */
  @Get('designs')
  listDesigns(
    @Query() query: ListStorefrontDesignsDto,
  ): Promise<StorefrontListResult> {
    return this.storefrontService.listDesigns(query);
  }

  /**
   * Búsqueda semántica (por vectores) de diseños a partir de una consulta en
   * lenguaje natural. Embebe `q` y ordena por similitud coseno.
   */
  @Get('search')
  search(
    @Query() query: SearchStorefrontDesignsDto,
  ): Promise<StorefrontListResult> {
    return this.storefrontService.search(query);
  }

  /** Detalle de un producto por slug SEO. */
  @Get('designs/:slug')
  getBySlug(
    @Param('slug') slug: string,
    @Query('store') store?: string,
  ): Promise<StorefrontProduct> {
    return this.storefrontService.getBySlug(slug, store);
  }
}

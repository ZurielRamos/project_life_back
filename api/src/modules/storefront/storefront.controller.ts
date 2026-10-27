import { Controller, Get, Param, Query } from '@nestjs/common';
import { Public } from '../auth/decorators/public.decorator';
import { ListStorefrontDesignsDto } from './dto/list-storefront-designs.dto';
import { SearchStorefrontDesignsDto } from './dto/search-storefront-designs.dto';
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
  constructor(private readonly storefrontService: StorefrontService) {}

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
  getBySlug(@Param('slug') slug: string): Promise<StorefrontProduct> {
    return this.storefrontService.getBySlug(slug);
  }
}

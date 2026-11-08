import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export const STOREFRONT_SORTS = [
  'newest',
  'oldest',
  'price-asc',
  'price-desc',
  'random',
] as const;
export type StorefrontSort = (typeof STOREFRONT_SORTS)[number];

/**
 * Filtros de la tienda pública. `fit` es la clave de un ajuste
 * administrable (p.ej. men, women, unisex, kids, family u otros creados).
 */
export class ListStorefrontDesignsDto {
  @IsOptional()
  @IsString()
  @MaxLength(60)
  fit?: string;

  /** Filtro opcional por categoría (texto libre del producto). */
  @IsOptional()
  @IsString()
  category?: string;

  /** Slug de la tienda: limita el catálogo a lo que esa tienda publica. */
  @IsOptional()
  @IsString()
  store?: string;

  /** Búsqueda de texto por nombre del diseño/producto. */
  @IsOptional()
  @IsString()
  q?: string;

  /** Producto base: solo diseños sobre ese producto. */
  @IsOptional()
  @IsUUID('4')
  product?: string;

  /**
   * Selección manual: ids de diseños separados por coma (máx. 24). Se
   * devuelven en ese mismo orden.
   */
  @IsOptional()
  @Matches(
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}(,[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}){0,23}$/i,
    { message: 'ids debe ser una lista de hasta 24 ids separados por coma' },
  )
  ids?: string;

  /** Orden del resultado (por defecto, los más recientes primero). */
  @IsOptional()
  @IsIn(STOREFRONT_SORTS)
  sort?: StorefrontSort;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(60)
  limit?: number = 24;

  @IsOptional()
  @IsInt()
  @Min(0)
  offset?: number = 0;
}

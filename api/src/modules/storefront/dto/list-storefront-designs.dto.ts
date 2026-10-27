import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import type { ProductFit } from '../../products/entities/product.entity';

/**
 * Filtros de la tienda pública. `fit` mapea el género de la sección del
 * home: mujer=women, hombre=men, unisex=unisex, niños=kids.
 */
export class ListStorefrontDesignsDto {
  @IsOptional()
  @IsEnum(['men', 'women', 'unisex', 'kids', 'family'], {
    message: 'fit debe ser men, women, unisex, kids o family',
  })
  fit?: ProductFit;

  /** Filtro opcional por categoría (texto libre del producto). */
  @IsOptional()
  @IsString()
  category?: string;

  /** Búsqueda de texto por nombre del diseño/producto. */
  @IsOptional()
  @IsString()
  q?: string;

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

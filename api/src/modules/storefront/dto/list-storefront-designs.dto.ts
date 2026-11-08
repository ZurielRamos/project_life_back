import { IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

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

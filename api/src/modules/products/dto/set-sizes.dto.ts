import { Type } from 'class-transformer';
import {
  IsArray,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

/** Una talla dentro del set de tallas del producto. */
export class ProductSizeInputDto {
  @IsString()
  @MinLength(1)
  @MaxLength(40)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  labelName?: string;

  /**
   * Precio específico de la talla en centavos (opcional). Si se omite/null,
   * la tienda usa el precio base del producto como fallback.
   */
  @IsOptional()
  @IsInt()
  @Min(0)
  priceCents?: number | null;

  /**
   * Medidas por dimensión del size chart. Las claves deben coincidir con
   * `sizeChartColumns` del producto. Valores numéricos.
   */
  @IsOptional()
  @IsObject()
  measurements?: Record<string, number>;
}

/**
 * Reemplaza por completo el conjunto de tallas del producto. El orden del
 * array define la posición de cada talla.
 */
export class SetSizesDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductSizeInputDto)
  sizes: ProductSizeInputDto[];
}

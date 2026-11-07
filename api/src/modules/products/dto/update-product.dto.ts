import { Type } from 'class-transformer';
import {
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { PRODUCT_FITS } from '../entities/product.entity';
import { ModelInfoDto } from './model-info.dto';

/**
 * Actualiza los datos base y atributos de catálogo del producto. Las
 * tallas, áreas de impresión y sesiones se gestionan con sus propios
 * endpoints para mantener cada operación acotada y clara.
 */
export class UpdateProductDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(150)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  brand?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  category?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  composition?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  careInstructions?: string;

  /** Ajuste del producto (enum fijo). Null/omitido no lo cambia. */
  @IsOptional()
  @IsIn(PRODUCT_FITS)
  fit?: (typeof PRODUCT_FITS)[number];

  /**
   * Categoría del ajuste (ver /fit-categories). Debe pertenecer al `fit`
   * del producto. `null` limpia la categoría.
   */
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsUUID('4')
  fitCategoryId?: string | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  basePriceCents?: number;

  @IsOptional()
  @IsString()
  @MaxLength(3)
  currency?: string;

  @IsOptional()
  @IsIn(['cm', 'inch'])
  sizeChartUnit?: 'cm' | 'inch';

  /** Dimensiones (columnas) del size chart, p.ej. ["Chest","Sleeve"]. */
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  sizeChartColumns?: string[];

  @IsOptional()
  @ValidateNested()
  @Type(() => ModelInfoDto)
  modelInfo?: ModelInfoDto;
}

import { Type } from 'class-transformer';
import {
  IsArray,
  IsString,
  Matches,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';

/** Un color dentro del set de colores del producto. */
export class ProductColorInputDto {
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  name: string;

  /** Hex de 3, 6 u 8 dígitos (con o sin alpha), con "#". */
  @IsString()
  @Matches(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/, {
    message: 'El color debe ser un hex válido, p.ej. #1a1a1a',
  })
  hex: string;
}

/**
 * Reemplaza por completo el conjunto de colores del producto. El orden
 * del array define la posición de cada color.
 */
export class SetColorsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductColorInputDto)
  colors: ProductColorInputDto[];
}

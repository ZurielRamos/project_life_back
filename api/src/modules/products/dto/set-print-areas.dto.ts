import { Type } from 'class-transformer';
import {
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

/** Un área de impresión dentro del set de áreas del producto. */
export class PrintAreaInputDto {
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  widthMm?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  heightMm?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  maxWidthMm?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  maxHeightMm?: number;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  technique?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  sudomockSmartObjectUuid?: string;
}

/**
 * Reemplaza por completo el conjunto de áreas de impresión del producto.
 * El orden del array define la posición de cada área.
 */
export class SetPrintAreasDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PrintAreaInputDto)
  printAreas: PrintAreaInputDto[];
}

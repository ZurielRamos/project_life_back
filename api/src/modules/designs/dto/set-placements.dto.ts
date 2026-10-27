import { Type } from 'class-transformer';
import {
  IsArray,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';

/** Una imagen colocada dentro de un área de impresión. */
export class PlacementInputDto {
  /** Área de impresión del producto sobre la que se coloca. */
  @IsUUID('4')
  printAreaId: string;

  @IsString()
  imageUrl: string;

  @IsOptional()
  @IsString()
  imagePublicId?: string;

  @IsNumber()
  xMm: number;

  @IsNumber()
  yMm: number;

  @IsNumber()
  @Min(0)
  widthMm: number;

  @IsNumber()
  @Min(0)
  heightMm: number;

  @IsOptional()
  @IsNumber()
  rotation?: number;

  @IsOptional()
  @IsNumber()
  zIndex?: number;
}

/**
 * Reemplaza por completo las colocaciones del diseño. El frontend envía
 * el estado completo del editor (todas las imágenes de todas las áreas).
 */
export class SetPlacementsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PlacementInputDto)
  placements: PlacementInputDto[];
}

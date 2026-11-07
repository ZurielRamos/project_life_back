import { Type } from 'class-transformer';
import {
  IsArray,
  IsNumber,
  IsObject,
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

  /** Tamaño (px) del área de diseño contra la que se autoró la geometría. */
  @IsOptional()
  @IsNumber()
  @Min(1)
  authorAreaWidthPx?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  authorAreaHeightPx?: number;

  @IsOptional()
  @IsNumber()
  zIndex?: number;

  /** URL del SVG fuente (si la imagen se generó desde una plantilla). */
  @IsOptional()
  @IsString()
  svgUrl?: string;

  /** Valores de los campos `<text id>` usados al generar la imagen. */
  @IsOptional()
  @IsObject()
  fieldValues?: Record<string, string>;
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

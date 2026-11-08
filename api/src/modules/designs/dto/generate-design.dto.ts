import { Type } from 'class-transformer';
import {
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';

/** Una imagen colocada dentro de un área (geometría en mm). */
export class GeneratePlacementDto {
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
 * Crea un diseño y encola la generación de renders. El diseño se crea en
 * estado "generating"; los renders se procesan en segundo plano.
 */
export class GenerateDesignDto {
  @IsUUID('4')
  productId: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => GeneratePlacementDto)
  placements: GeneratePlacementDto[];

  /**
   * Área de impresión principal del diseño (id de PrintArea). Obligatoria
   * cuando el producto tiene áreas con sesiones ancladas; sus renders van
   * primero (portada y SEO).
   */
  @IsOptional()
  @IsUUID('4')
  mainPrintAreaId?: string;

  /** Si el diseño tiene copyright. Obligatorio: hay que elegirlo al crear. */
  @IsBoolean()
  hasCopyright: boolean;

  /**
   * Colores (ids del producto) para los que generar, EN ORDEN. El primero
   * es el principal. Vacío = render sin color.
   */
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsUUID('4', { each: true })
  colorIds?: string[];
}

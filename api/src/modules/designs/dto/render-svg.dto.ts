import { Type } from 'class-transformer';
import {
  IsArray,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

/**
 * Un campo de texto a sustituir en el SVG, con su alineación respecto al
 * texto original. `key` es el id del `<text>` o una clave sintética
 * "__textN" (posición). `anchorX`/`anchorY` y `textAnchor` definen dónde y
 * cómo se ancla el texto nuevo para conservar la alineación.
 */
export class RenderSvgFieldDto {
  @IsString()
  key: string;

  @IsString()
  value: string;

  @IsNumber()
  anchorX: number;

  @IsNumber()
  anchorY: number;

  @IsIn(['start', 'middle', 'end'])
  textAnchor: 'start' | 'middle' | 'end';
}

/**
 * Rasteriza una plantilla SVG sustituyendo el texto de sus `<text>` por los
 * valores de `fields`, respetando la alineación indicada. Devuelve la imagen
 * (PNG) subida a Cloudinary, lista para colocar como placement.
 */
export class RenderSvgDto {
  /** Contenido del SVG (texto). */
  @IsString()
  @MinLength(1)
  svg: string;

  /** Campos a sustituir, con su alineación/anclaje. */
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RenderSvgFieldDto)
  fields?: RenderSvgFieldDto[];

  /**
   * Ancho objetivo del PNG en px. El SVG (vectorial) se rasteriza a este
   * ancho para obtener alta resolución y evitar pixelado. El alto se deriva
   * de la proporción del SVG. Default: 2000.
   */
  @IsOptional()
  @IsInt()
  @Min(64)
  @Max(6000)
  targetWidth?: number;
}

import { Type } from 'class-transformer';
import {
  IsArray,
  IsOptional,
  IsString,
  IsUUID,
  ValidateNested,
} from 'class-validator';
import { GeneratePlacementDto } from './generate-design.dto';

/**
 * Genera una vista previa EFÍMERA (no persiste nada): renderiza el primer
 * color activo del área indicada y genera el SEO solo para mostrarlo.
 */
export class PreviewDesignDto {
  @IsUUID('4')
  productId: string;

  /** Área de impresión a previsualizar. */
  @IsUUID('4')
  printAreaId: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => GeneratePlacementDto)
  placements: GeneratePlacementDto[];

  /** Color (id del producto) a renderizar. Si se omite, render sin color. */
  @IsOptional()
  @IsUUID('4')
  colorId?: string;
}

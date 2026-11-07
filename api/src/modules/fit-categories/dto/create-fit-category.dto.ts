import { IsIn, IsString, MaxLength, MinLength } from 'class-validator';
import {
  PRODUCT_FITS,
  type ProductFit,
} from '../../products/entities/product.entity';

export class CreateFitCategoryDto {
  /** Ajuste (enum fijo) al que pertenece la categoría. */
  @IsIn(PRODUCT_FITS)
  fit: ProductFit;

  /** Nombre visible de la categoría, p.ej. "Oversize". */
  @IsString()
  @MinLength(1)
  @MaxLength(60)
  name: string;
}

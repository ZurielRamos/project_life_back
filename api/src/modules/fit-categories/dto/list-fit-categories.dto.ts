import { IsIn, IsOptional } from 'class-validator';
import {
  PRODUCT_FITS,
  type ProductFit,
} from '../../products/entities/product.entity';

export class ListFitCategoriesDto {
  /** Filtra por ajuste (enum fijo). Si se omite, devuelve todas. */
  @IsOptional()
  @IsIn(PRODUCT_FITS)
  fit?: ProductFit;
}

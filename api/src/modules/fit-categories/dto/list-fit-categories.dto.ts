import { IsOptional, IsString, MaxLength } from 'class-validator';

export class ListFitCategoriesDto {
  /** Filtra por clave de ajuste. Si se omite, devuelve todas. */
  @IsOptional()
  @IsString()
  @MaxLength(60)
  fit?: string;
}

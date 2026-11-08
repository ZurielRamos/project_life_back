import { IsString, MaxLength, MinLength } from 'class-validator';

export class CreateFitCategoryDto {
  /** Clave de un ajuste existente (se valida en el servicio). */
  @IsString()
  @MinLength(1)
  @MaxLength(60)
  fit: string;

  /** Nombre visible de la categoría, p.ej. "Oversize". */
  @IsString()
  @MinLength(1)
  @MaxLength(60)
  name: string;
}

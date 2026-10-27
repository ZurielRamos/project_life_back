import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

/**
 * Parámetros de la búsqueda semántica pública de diseños. `q` es la
 * consulta en lenguaje natural que se embebe y compara por similitud
 * vectorial contra los diseños indexados.
 */
export class SearchStorefrontDesignsDto {
  /** Consulta en lenguaje natural (p. ej. "un gato astronauta minimalista"). */
  @IsString()
  q: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(60)
  limit?: number = 24;

  @IsOptional()
  @IsInt()
  @Min(0)
  offset?: number = 0;
}

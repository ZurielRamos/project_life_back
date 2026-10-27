import { IsOptional, IsString, MaxLength } from 'class-validator';

/**
 * Regenera el SEO del diseño (texto + metadatos + embedding), sin volver
 * a renderizar. `hints` son referencias del usuario para guiar a la IA.
 */
export class RegenerateSeoDto {
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  hints?: string;

  /** URL de la imagen de referencia (render ya generado). */
  @IsOptional()
  @IsString()
  imageUrl?: string;
}

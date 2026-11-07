import { IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';

/**
 * Registra una tipografía. `family` debe coincidir con la `font-family`
 * usada en los SVG. `dataUri` es el archivo de fuente (.ttf/.otf/.woff2)
 * en base64 generado en el navegador.
 */
export class CreateFontDto {
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  family: string;

  @IsString()
  @Matches(/^data:[^;]*;base64,/, {
    message: 'dataUri debe ser un data URI en base64',
  })
  dataUri: string;

  /** Formato del archivo (ttf/otf/woff/woff2); informativo. */
  @IsOptional()
  @IsString()
  @MaxLength(10)
  format?: string;
}

import { IsString, MaxLength, MinLength } from 'class-validator';

export class CreateFitDto {
  /** Nombre visible del ajuste, p.ej. "Oversize". La clave se genera sola. */
  @IsString()
  @MinLength(1)
  @MaxLength(60)
  name: string;
}

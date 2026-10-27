import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

/** Paginación/filtro para el catálogo remoto de plantillas de SudoMock. */
export class ListRemoteMockupsDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number;

  @IsOptional()
  @IsString()
  name?: string;

  /**
   * Cuenta de SudoMock a consultar. Si se omite, se agregan las plantillas
   * de todas las cuentas configuradas.
   */
  @IsOptional()
  @IsString()
  accountId?: string;
}

import {
  ArrayUnique,
  IsArray,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';

/**
 * Datos de una sesión de fotos. `sudomockUuids` es la selección ordenada
 * de plantillas a importar DESDE SudoMock: el orden del array define la
 * posición de cada mockup dentro de la sesión. Al guardar, cada uuid se
 * trae de SudoMock y se embebe en la sesión.
 */
export class PhotoSessionInputDto {
  @IsString()
  @MinLength(1)
  @MaxLength(150)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  sudomockUuids?: string[];

  /** Cuenta de SudoMock de origen de los `sudomockUuids` (default "default"). */
  @IsOptional()
  @IsString()
  accountId?: string;

  /** Área de impresión (del mismo producto) a la que se ancla la sesión. */
  @IsOptional()
  @IsUUID('4')
  printAreaId?: string;
}

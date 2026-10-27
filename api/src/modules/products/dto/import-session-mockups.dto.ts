import {
  ArrayNotEmpty,
  ArrayUnique,
  IsArray,
  IsOptional,
  IsString,
} from 'class-validator';

/**
 * Importa plantillas de SudoMock a una sesión existente. Se añaden al
 * final, después de los mockups que ya tenga la sesión. `accountId`
 * indica de qué cuenta de SudoMock provienen los uuids.
 */
export class ImportSessionMockupsDto {
  @IsArray()
  @ArrayNotEmpty()
  @ArrayUnique()
  @IsString({ each: true })
  sudomockUuids: string[];

  /** Cuenta de SudoMock de origen. Si se omite, se usa "default". */
  @IsOptional()
  @IsString()
  accountId?: string;
}

import { ArrayUnique, IsArray, IsUUID } from 'class-validator';

/**
 * Reordena los mockups ya importados en una sesión. El array es la lista
 * completa de ids locales (SessionMockup.id) en el nuevo orden deseado.
 */
export class ReorderMockupsDto {
  @IsArray()
  @ArrayUnique()
  @IsUUID('4', { each: true })
  sessionMockupIds: string[];
}

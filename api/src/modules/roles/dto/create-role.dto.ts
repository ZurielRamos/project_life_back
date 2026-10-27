import {
  ArrayUnique,
  IsArray,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateRoleDto {
  @IsString()
  @MinLength(2)
  @MaxLength(60)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  description?: string;

  /** IDs de permisos a asociar al rol. */
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsUUID('4', { each: true })
  permissionIds?: string[];
}

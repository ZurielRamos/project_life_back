import {
  IsArray,
  IsEmail,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateUserDto {
  @IsEmail({}, { message: 'El email no es válido' })
  email: string;

  @IsString()
  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres' })
  @MaxLength(72, { message: 'La contraseña no puede exceder 72 caracteres' })
  password: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string;

  /** IDs de roles a asignar al crear el usuario. */
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  roleIds?: string[];
}

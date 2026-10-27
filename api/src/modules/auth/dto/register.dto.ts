import { IsEmail, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class RegisterDto {
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
}

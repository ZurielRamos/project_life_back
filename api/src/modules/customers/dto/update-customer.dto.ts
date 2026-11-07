import {
  ArrayUnique,
  IsArray,
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import type { CustomerGender } from '../entities/customer.entity';

const GENDERS: CustomerGender[] = ['female', 'male', 'other', 'prefer_not'];

/**
 * Actualización del perfil del cliente desde el storefront. Todos los campos
 * son opcionales; el celular (identificador de login) y la contraseña NO se
 * cambian por aquí.
 */
export class UpdateCustomerDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsIn(GENDERS)
  gender?: CustomerGender;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  city?: string;

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  interests?: string[];
}

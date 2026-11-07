import {
  ArrayUnique,
  IsArray,
  IsBoolean,
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
 * Captura de datos de un cliente NUEVO. Se envía después de verificar el OTP:
 * el celular no viaja aquí, sale del `registrationToken` que emite la
 * verificación (así nadie puede registrar un número que no verificó).
 */
export class RegisterCustomerDto {
  /** Token de corta vida emitido al verificar el OTP de un número nuevo. */
  @IsString()
  @MinLength(10)
  registrationToken: string;

  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name: string;

  /** Correo opcional (canal secundario de campañas). */
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

  @IsOptional()
  @IsString()
  @MaxLength(120)
  acquisitionSource?: string;

  /** Debe ser true: acepta términos y recibir publicidad. */
  @IsBoolean()
  marketingOptIn: boolean;

  /** Versión del texto de términos aceptado. */
  @IsOptional()
  @IsString()
  @MaxLength(40)
  consentVersion?: string;

  /** Origen del registro (slug del diseño, etc.). */
  @IsOptional()
  @IsString()
  @MaxLength(200)
  signupOrigin?: string;
}

import { IsString, Matches, MaxLength, MinLength } from 'class-validator';

/** Paso 1 del acceso: pide un OTP para un número (nuevo o existente). */
export class RequestOtpDto {
  @IsString()
  @MinLength(7)
  @MaxLength(15)
  phone: string;
}

/** Paso 2 del acceso: verifica el OTP recibido por WhatsApp. */
export class VerifyOtpDto {
  @IsString()
  @MinLength(7)
  @MaxLength(15)
  phone: string;

  @IsString()
  @Matches(/^\d{4,8}$/, { message: 'El código debe ser numérico.' })
  code: string;
}

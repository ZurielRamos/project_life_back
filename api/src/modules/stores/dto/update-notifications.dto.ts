import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEmail,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';

/** Ajustes de correo SMTP. Los campos omitidos no se modifican. */
export class SmtpSettingsDto {
  @IsOptional() @IsBoolean() enabled?: boolean;

  @IsOptional() @IsString() @MaxLength(253) host?: string;

  @IsOptional() @IsInt() @Min(1) @Max(65535) port?: number;

  @IsOptional() @IsBoolean() secure?: boolean;

  @IsOptional() @IsString() @MaxLength(255) username?: string;

  /** Contraseña nueva. Omitida o vacía = se conserva la guardada. */
  @IsOptional() @IsString() @MaxLength(500) password?: string;

  /** true = borrar la contraseña guardada. */
  @IsOptional() @IsBoolean() clearPassword?: boolean;

  @IsOptional() @IsString() @MaxLength(100) fromName?: string;

  /** Cadena vacía = quitar el remitente. */
  @ValidateIf((o: SmtpSettingsDto) => !!o.fromEmail)
  @IsEmail()
  @MaxLength(254)
  fromEmail?: string;
}

/** Ajustes de WhatsApp. Los campos omitidos no se modifican. */
export class WhatsappSettingsDto {
  @IsOptional() @IsBoolean() enabled?: boolean;

  /** URL base de la API (https://…). */
  @IsOptional() @IsString() @MaxLength(300) apiUrl?: string;

  @ValidateIf((o: WhatsappSettingsDto) => !!o.accountSlug)
  @Matches(/^[A-Za-z0-9_-]{1,60}$/, {
    message: 'El slug de la cuenta solo admite letras, números, guiones y _',
  })
  accountSlug?: string;

  @IsOptional() @IsString() @MaxLength(100) channelId?: string;

  @ValidateIf((o: WhatsappSettingsDto) => !!o.templateName)
  @Matches(/^[A-Za-z0-9_-]{1,100}$/, {
    message:
      'El nombre de la plantilla solo admite letras, números, guiones y _',
  })
  templateName?: string;

  @ValidateIf((o: WhatsappSettingsDto) => !!o.languageCode)
  @Matches(/^[A-Za-z]{2,3}([_-][A-Za-z]{2,4})?$/, {
    message: 'El código de idioma no es válido (ej. es, es_CO, en_US)',
  })
  languageCode?: string;

  /** Token nuevo. Omitido o vacío = se conserva el guardado. */
  @IsOptional() @IsString() @MaxLength(500) apiToken?: string;

  /** true = borrar el token guardado. */
  @IsOptional() @IsBoolean() clearApiToken?: boolean;
}

export class UpdateNotificationsDto {
  @IsOptional()
  @ValidateNested()
  @Type(() => SmtpSettingsDto)
  smtp?: SmtpSettingsDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => WhatsappSettingsDto)
  whatsapp?: WhatsappSettingsDto;
}

export class TestEmailDto {
  @IsEmail()
  @MaxLength(254)
  to: string;
}

export class TestWhatsappDto {
  @IsString()
  @Matches(/^\+?[\d\s().-]{8,20}$/, {
    message: 'El número de celular no es válido',
  })
  phone: string;
}

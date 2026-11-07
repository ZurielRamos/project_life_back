import { Type } from 'class-transformer';
import {
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsEmail,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  MinLength,
  ValidateIf,
  ValidateNested,
} from 'class-validator';

/** Redes sociales; cada valor es una URL o usuario libre. */
export class StoreSocialLinksDto {
  @IsOptional() @IsString() @MaxLength(255) instagram?: string;
  @IsOptional() @IsString() @MaxLength(255) facebook?: string;
  @IsOptional() @IsString() @MaxLength(255) tiktok?: string;
  @IsOptional() @IsString() @MaxLength(255) x?: string;
  @IsOptional() @IsString() @MaxLength(255) youtube?: string;
  @IsOptional() @IsString() @MaxLength(255) pinterest?: string;
  @IsOptional() @IsString() @MaxLength(255) whatsapp?: string;
}

export class CreateStoreDto {
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  name: string;

  @IsString()
  @MinLength(2)
  @MaxLength(60)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: 'El subdominio solo admite minúsculas, números y guiones',
  })
  slug: string;

  @IsOptional() @IsBoolean() isActive?: boolean;

  @IsOptional() @IsString() @MaxLength(120) title?: string;
  @IsOptional() @IsString() @MaxLength(200) tagline?: string;
  @IsOptional() @IsString() @MaxLength(2000) description?: string;
  @IsOptional() @IsString() @MaxLength(2048) logoUrl?: string;
  @IsOptional() @IsString() @MaxLength(2048) faviconUrl?: string;

  /** Cadena vacía = quitar el color. */
  @ValidateIf((o: CreateStoreDto) => !!o.primaryColor)
  @Matches(/^#[0-9a-fA-F]{6}$/, { message: 'El color debe ser un hex #RRGGBB' })
  primaryColor?: string;

  /** Cadena vacía = quitar el correo. */
  @ValidateIf((o: CreateStoreDto) => !!o.contactEmail)
  @IsEmail()
  contactEmail?: string;
  @IsOptional() @IsString() @MaxLength(40) phone?: string;
  @IsOptional() @IsString() @MaxLength(500) address?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => StoreSocialLinksDto)
  socialLinks?: StoreSocialLinksDto;

  @IsOptional()
  @IsString()
  @Matches(/^[A-Za-z]{3}$/, {
    message: 'La moneda debe ser un código de 3 letras',
  })
  currency?: string;

  @IsOptional() @IsString() @MaxLength(10) locale?: string;

  @IsOptional() @IsString() @MaxLength(120) seoTitle?: string;
  @IsOptional() @IsString() @MaxLength(320) seoDescription?: string;

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsUUID('4', { each: true })
  productIds?: string[];

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsUUID('4', { each: true })
  designIds?: string[];

  /**
   * Secciones de la configuración del sitio a actualizar (cada una reemplaza a
   * la anterior). Se valida y normaliza en el servicio (ver site-config.ts).
   */
  @IsOptional()
  @IsObject()
  siteConfig?: Record<string, unknown>;
}

import { IsString, MaxLength, MinLength } from 'class-validator';

export class AddDomainDto {
  /** Dominio o subdominio (ej. "mitienda.com", "shop.mitienda.com"). */
  @IsString()
  @MinLength(3)
  @MaxLength(253)
  hostname: string;
}

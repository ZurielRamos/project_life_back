import { IsOptional, IsUUID, ValidateIf } from 'class-validator';

export class SetPrimaryDomainDto {
  /** Id del dominio favorito; null = subdominio de la plataforma. */
  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsUUID('4')
  domainId?: string | null;
}

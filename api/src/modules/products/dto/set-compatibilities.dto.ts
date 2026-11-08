import { Type } from 'class-transformer';
import { IsArray, IsUUID, ValidateNested } from 'class-validator';

/** Un vínculo: área de este producto ↔ área de otro producto. */
export class CompatibilityLinkDto {
  @IsUUID('4')
  printAreaId: string;

  @IsUUID('4')
  compatiblePrintAreaId: string;
}

/** Reemplaza por completo las compatibilidades de las áreas del producto. */
export class SetCompatibilitiesDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CompatibilityLinkDto)
  links: CompatibilityLinkDto[];
}

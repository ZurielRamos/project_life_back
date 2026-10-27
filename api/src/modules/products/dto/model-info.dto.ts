import { IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

/** Información del modelo que aparece en las fotos del producto. */
export class ModelInfoDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  label?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  heightCm?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  weightKg?: number;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  wearingSize?: string;
}

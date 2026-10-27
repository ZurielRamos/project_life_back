import { Type } from 'class-transformer';
import {
  IsArray,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { PhotoSessionInputDto } from './photo-session.dto';

export class CreateProductDto {
  @IsString()
  @MinLength(1)
  @MaxLength(150)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  /** Sesiones de fotos iniciales (opcional; se pueden agregar luego). */
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PhotoSessionInputDto)
  photoSessions?: PhotoSessionInputDto[];
}

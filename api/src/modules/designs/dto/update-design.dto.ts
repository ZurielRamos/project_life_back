import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class UpdateDesignDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(150)
  name?: string;
}

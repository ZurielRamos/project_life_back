import { PartialType } from '@nestjs/mapped-types';
import { IsBoolean, IsOptional } from 'class-validator';
import { CreateUserDto } from './create-user.dto';

/**
 * Todos los campos de creación son opcionales al actualizar,
 * más la posibilidad de activar/desactivar la cuenta.
 */
export class UpdateUserDto extends PartialType(CreateUserDto) {
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

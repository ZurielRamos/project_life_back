import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { Permissions } from '../auth/permissions.enum';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { Role } from './entities/role.entity';
import { RolesService } from './roles.service';

@Controller('roles')
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Post()
  @RequirePermissions(Permissions.RolesCreate)
  create(@Body() dto: CreateRoleDto): Promise<Role> {
    return this.rolesService.create(dto);
  }

  @Get()
  @RequirePermissions(Permissions.RolesRead)
  findAll(): Promise<Role[]> {
    return this.rolesService.findAll();
  }

  @Get(':id')
  @RequirePermissions(Permissions.RolesRead)
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<Role> {
    return this.rolesService.findOne(id);
  }

  @Patch(':id')
  @RequirePermissions(Permissions.RolesUpdate)
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateRoleDto,
  ): Promise<Role> {
    return this.rolesService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions(Permissions.RolesDelete)
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.rolesService.remove(id);
  }
}

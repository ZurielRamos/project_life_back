import { Controller, Get } from '@nestjs/common';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { Permissions } from '../auth/permissions.enum';
import { Permission } from './entities/permission.entity';
import { PermissionsService } from './permissions.service';

@Controller('permissions')
export class PermissionsController {
  constructor(private readonly permissionsService: PermissionsService) {}

  @Get()
  @RequirePermissions(Permissions.PermissionsRead)
  findAll(): Promise<Permission[]> {
    return this.permissionsService.findAll();
  }
}

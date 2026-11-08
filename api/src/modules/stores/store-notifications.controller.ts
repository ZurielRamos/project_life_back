import {
  Body,
  Controller,
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
import {
  TestEmailDto,
  TestWhatsappDto,
  UpdateNotificationsDto,
} from './dto/update-notifications.dto';
import {
  StoreNotificationsService,
  type NotificationsView,
  type TestResult,
} from './store-notifications.service';

/**
 * Notificaciones de la tienda (correo SMTP y WhatsApp). Requiere un permiso
 * propio: incluso la lectura queda restringida porque expone datos de
 * infraestructura (servidores, usuarios, cuentas).
 */
@Controller('stores/:id/notifications')
export class StoreNotificationsController {
  constructor(private readonly notifications: StoreNotificationsService) {}

  @Get()
  @RequirePermissions(Permissions.StoresNotifications)
  get(@Param('id', ParseUUIDPipe) id: string): Promise<NotificationsView> {
    return this.notifications.get(id);
  }

  @Patch()
  @RequirePermissions(Permissions.StoresNotifications)
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateNotificationsDto,
  ): Promise<NotificationsView> {
    return this.notifications.update(id, dto);
  }

  @Post('test-email')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(Permissions.StoresNotifications)
  testEmail(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: TestEmailDto,
  ): Promise<TestResult> {
    return this.notifications.testEmail(id, dto.to);
  }

  @Post('test-whatsapp')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(Permissions.StoresNotifications)
  testWhatsapp(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: TestWhatsappDto,
  ): Promise<TestResult> {
    return this.notifications.testWhatsapp(id, dto.phone);
  }
}

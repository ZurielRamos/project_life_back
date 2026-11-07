import { Body, Controller, Get, Put } from '@nestjs/common';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { Permissions } from '../auth/permissions.enum';
import { UpdateGenerationSettingsDto } from './dto/update-generation-settings.dto';
import { GenerationSettings } from './entities/generation-settings.entity';
import { SettingsService } from './settings.service';

@Controller('settings/generation')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  @RequirePermissions(Permissions.GenerationSettingsRead)
  get(): Promise<GenerationSettings> {
    return this.settingsService.getGenerationSettings();
  }

  @Put()
  @RequirePermissions(Permissions.GenerationSettingsUpdate)
  update(
    @Body() dto: UpdateGenerationSettingsDto,
  ): Promise<GenerationSettings> {
    return this.settingsService.updateGenerationSettings(dto);
  }
}

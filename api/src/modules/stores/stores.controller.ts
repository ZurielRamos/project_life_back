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
  Query,
} from '@nestjs/common';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { Permissions } from '../auth/permissions.enum';
import { CreateStoreDto } from './dto/create-store.dto';
import { UpdateStoreDto } from './dto/update-store.dto';
import { StoresService, type StoreView } from './stores.service';

@Controller('stores')
export class StoresController {
  constructor(private readonly storesService: StoresService) {}

  @Post()
  @RequirePermissions(Permissions.StoresCreate)
  create(@Body() dto: CreateStoreDto): Promise<StoreView> {
    return this.storesService.create(dto);
  }

  @Get()
  @RequirePermissions(Permissions.StoresRead)
  findAll() {
    return this.storesService.findAll();
  }

  /** Dominio base de las tiendas. Debe ir antes de ':id'. */
  @Get('config')
  @RequirePermissions(Permissions.StoresRead)
  getConfig() {
    return this.storesService.getConfig();
  }

  /** Disponibilidad de un subdominio. Debe ir antes de ':id'. */
  @Get('subdomain-availability')
  @RequirePermissions(Permissions.StoresRead)
  checkSubdomain(
    @Query('subdomain') subdomain: string,
    @Query('storeId') storeId?: string,
  ) {
    return this.storesService.checkSubdomain(subdomain, storeId);
  }

  @Get(':id')
  @RequirePermissions(Permissions.StoresRead)
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<StoreView> {
    return this.storesService.findOne(id);
  }

  @Patch(':id')
  @RequirePermissions(Permissions.StoresUpdate)
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateStoreDto,
  ): Promise<StoreView> {
    return this.storesService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions(Permissions.StoresDelete)
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.storesService.remove(id);
  }
}

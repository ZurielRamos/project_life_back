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
import { AddDomainDto } from './dto/add-domain.dto';
import { CreateStoreDto } from './dto/create-store.dto';
import { UpdateStoreDto } from './dto/update-store.dto';
import { UploadStoreAssetDto } from './dto/upload-store-asset.dto';
import { StoreDomainsService } from './store-domains.service';
import { StoresService, type StoreView } from './stores.service';

@Controller('stores')
export class StoresController {
  constructor(
    private readonly storesService: StoresService,
    private readonly domainsService: StoreDomainsService,
  ) {}

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

  // --- Dominios personalizados ---

  @Get(':id/domains')
  @RequirePermissions(Permissions.StoresRead)
  listDomains(@Param('id', ParseUUIDPipe) id: string) {
    return this.domainsService.list(id);
  }

  @Post(':id/domains')
  @RequirePermissions(Permissions.StoresUpdate)
  addDomain(@Param('id', ParseUUIDPipe) id: string, @Body() dto: AddDomainDto) {
    return this.domainsService.add(id, dto.hostname);
  }

  @Post(':id/domains/:domainId/verify')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(Permissions.StoresUpdate)
  verifyDomain(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('domainId', ParseUUIDPipe) domainId: string,
  ) {
    return this.domainsService.verify(id, domainId);
  }

  @Delete(':id/domains/:domainId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions(Permissions.StoresUpdate)
  async removeDomain(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('domainId', ParseUUIDPipe) domainId: string,
  ): Promise<void> {
    await this.domainsService.remove(id, domainId);
  }

  /** Sube una imagen del sitio (logo, banner…) y devuelve su URL. */
  @Post(':id/assets')
  @RequirePermissions(Permissions.StoresUpdate)
  uploadAsset(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UploadStoreAssetDto,
  ) {
    return this.storesService.uploadAsset(id, dto.dataUri);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions(Permissions.StoresDelete)
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.storesService.remove(id);
  }
}

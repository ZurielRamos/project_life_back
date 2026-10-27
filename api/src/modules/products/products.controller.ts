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
  Put,
  Query,
} from '@nestjs/common';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { Permissions } from '../auth/permissions.enum';
import { CreateProductDto } from './dto/create-product.dto';
import { ImportSessionMockupsDto } from './dto/import-session-mockups.dto';
import { ListRemoteMockupsDto } from './dto/list-remote-mockups.dto';
import { PhotoSessionInputDto } from './dto/photo-session.dto';
import { ReorderMockupsDto } from './dto/reorder-mockups.dto';
import { SetColorsDto } from './dto/set-colors.dto';
import { SetPrintAreasDto } from './dto/set-print-areas.dto';
import { SetSizesDto } from './dto/set-sizes.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { PhotoSession } from './entities/photo-session.entity';
import { Product } from './entities/product.entity';
import {
  ProductsService,
  RemoteMockupListResult,
} from './products.service';

@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  // --- Catálogo remoto (SudoMock) ---

  /**
   * Lista el catálogo de plantillas de SudoMock para elegir cuáles
   * importar a una sesión. No persiste nada.
   */
  @Get('mockups/remote')
  @RequirePermissions(Permissions.ProductsImport)
  listRemoteMockups(
    @Query() query: ListRemoteMockupsDto,
  ): Promise<RemoteMockupListResult> {
    return this.productsService.listRemoteMockups(query);
  }

  // --- Productos ---

  @Post()
  @RequirePermissions(Permissions.ProductsCreate)
  create(@Body() dto: CreateProductDto): Promise<Product> {
    return this.productsService.create(dto);
  }

  @Get()
  @RequirePermissions(Permissions.ProductsRead)
  findAll(): Promise<Product[]> {
    return this.productsService.findAll();
  }

  @Get(':id')
  @RequirePermissions(Permissions.ProductsRead)
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<Product> {
    return this.productsService.findOne(id);
  }

  @Patch(':id')
  @RequirePermissions(Permissions.ProductsUpdate)
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProductDto,
  ): Promise<Product> {
    return this.productsService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions(Permissions.ProductsDelete)
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.productsService.remove(id);
  }

  // --- Tallas y size chart ---

  /** Reemplaza por completo las tallas del producto (incluye size chart). */
  @Put(':id/sizes')
  @RequirePermissions(Permissions.ProductsUpdate)
  setSizes(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SetSizesDto,
  ): Promise<Product> {
    return this.productsService.setSizes(id, dto);
  }

  // --- Colores ---

  /** Reemplaza por completo los colores disponibles del producto. */
  @Put(':id/colors')
  @RequirePermissions(Permissions.ProductsUpdate)
  setColors(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SetColorsDto,
  ): Promise<Product> {
    return this.productsService.setColors(id, dto);
  }

  // --- Áreas de impresión ---

  /** Reemplaza por completo las áreas de impresión del producto. */
  @Put(':id/print-areas')
  @RequirePermissions(Permissions.ProductsUpdate)
  setPrintAreas(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SetPrintAreasDto,
  ): Promise<Product> {
    return this.productsService.setPrintAreas(id, dto);
  }

  // --- Sesiones de fotos (anidadas bajo el producto) ---

  @Get(':id/sessions/:sessionId')
  @RequirePermissions(Permissions.ProductsRead)
  getSession(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
  ): Promise<PhotoSession> {
    return this.productsService.findSession(id, sessionId);
  }

  @Post(':id/sessions')
  @RequirePermissions(Permissions.ProductsUpdate)
  addSession(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: PhotoSessionInputDto,
  ): Promise<PhotoSession> {
    return this.productsService.addSession(id, dto);
  }

  @Put(':id/sessions/:sessionId')
  @RequirePermissions(Permissions.ProductsUpdate)
  updateSession(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
    @Body() dto: PhotoSessionInputDto,
  ): Promise<PhotoSession> {
    return this.productsService.updateSession(id, sessionId, dto);
  }

  @Delete(':id/sessions/:sessionId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions(Permissions.ProductsUpdate)
  async removeSession(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
  ): Promise<void> {
    await this.productsService.removeSession(id, sessionId);
  }

  // --- Mockups de la sesión (importados de SudoMock) ---

  /** Importa plantillas de SudoMock a la sesión (se añaden al final). */
  @Post(':id/sessions/:sessionId/mockups/import')
  @RequirePermissions(Permissions.ProductsImport)
  importMockups(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
    @Body() dto: ImportSessionMockupsDto,
  ): Promise<PhotoSession> {
    return this.productsService.importMockups(id, sessionId, dto);
  }

  /** Reordena los mockups ya importados de la sesión. */
  @Patch(':id/sessions/:sessionId/mockups/order')
  @RequirePermissions(Permissions.ProductsUpdate)
  reorderMockups(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
    @Body() dto: ReorderMockupsDto,
  ): Promise<PhotoSession> {
    return this.productsService.reorderMockups(id, sessionId, dto);
  }

  @Delete(':id/sessions/:sessionId/mockups/:sessionMockupId')
  @RequirePermissions(Permissions.ProductsUpdate)
  removeMockup(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
    @Param('sessionMockupId', ParseUUIDPipe) sessionMockupId: string,
  ): Promise<PhotoSession> {
    return this.productsService.removeMockup(id, sessionId, sessionMockupId);
  }
}

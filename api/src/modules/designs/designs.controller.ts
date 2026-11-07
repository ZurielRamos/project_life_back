import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Query,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { Permissions } from '../auth/permissions.enum';
import type { UploadedImage } from '../cloudinary/cloudinary.service';
import {
  DesignsService,
  type DesignSeoView,
  type DesignSummary,
  type PreviewResult,
  type RenderSvgResult,
} from './designs.service';
import { GenerateDesignDto } from './dto/generate-design.dto';
import { PreviewDesignDto } from './dto/preview-design.dto';
import { RegenerateSeoDto } from './dto/regenerate-seo.dto';
import { RenderSvgDto } from './dto/render-svg.dto';
import { SetPlacementsDto } from './dto/set-placements.dto';
import { UpdateDesignDto } from './dto/update-design.dto';
import { UploadImageDto } from './dto/upload-image.dto';
import { Design } from './entities/design.entity';

@Controller('designs')
export class DesignsController {
  constructor(private readonly designsService: DesignsService) {}

  /**
   * Vista previa EFÍMERA: renderiza el primer color del área + SEO, sin
   * persistir nada. Para mostrar cómo quedará antes de "Generar".
   */
  @Post('preview')
  @RequirePermissions(Permissions.DesignsCreate)
  preview(@Body() dto: PreviewDesignDto): Promise<PreviewResult> {
    return this.designsService.previewDesign(dto);
  }

  /**
   * Crea el diseño (estado "generating") y encola la generación de renders
   * en segundo plano. Devuelve el diseño inmediatamente.
   */
  @Post('generate')
  @RequirePermissions(Permissions.DesignsCreate)
  generate(@Body() dto: GenerateDesignDto): Promise<Design> {
    return this.designsService.generate(dto);
  }

  @Get()
  @RequirePermissions(Permissions.DesignsRead)
  findAll(): Promise<DesignSummary[]> {
    return this.designsService.findAll();
  }

  /** Búsqueda semántica de diseños por significado (pgvector). */
  @Get('search')
  @RequirePermissions(Permissions.DesignsRead)
  search(@Query('q') q?: string): Promise<Design[]> {
    return this.designsService.search(q ?? '');
  }

  @Get(':id')
  @RequirePermissions(Permissions.DesignsRead)
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<Design> {
    return this.designsService.findOne(id);
  }

  /** Estado ligero para polling (progreso de renders + estado). */
  @Get(':id/status')
  @RequirePermissions(Permissions.DesignsRead)
  getStatus(@Param('id', ParseUUIDPipe) id: string) {
    return this.designsService.getStatus(id);
  }

  @Patch(':id')
  @RequirePermissions(Permissions.DesignsUpdate)
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateDesignDto,
  ): Promise<Design> {
    return this.designsService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions(Permissions.DesignsDelete)
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.designsService.remove(id);
  }

  /** Sube una imagen de diseño a Cloudinary (devuelve url y publicId). */
  @Post('upload-image')
  @RequirePermissions(Permissions.DesignsUpdate)
  uploadImage(@Body() dto: UploadImageDto): Promise<UploadedImage> {
    return this.designsService.uploadImage(dto);
  }

  /**
   * Rasteriza una plantilla SVG con los valores de texto indicados y
   * devuelve el PNG (en Cloudinary) + el SVG fuente + fuentes faltantes.
   */
  @Post('render-svg')
  @RequirePermissions(Permissions.DesignsUpdate)
  renderSvg(@Body() dto: RenderSvgDto): Promise<RenderSvgResult> {
    return this.designsService.renderSvg(dto);
  }

  /**
   * Descarga un ZIP con los archivos del diseño (imágenes por área, SVG y
   * fuentes), nombrado con el código del diseño.
   */
  @Get(':id/download')
  @RequirePermissions(Permissions.DesignsRead)
  @Header('Content-Type', 'application/zip')
  async download(
    @Param('id', ParseUUIDPipe) id: string,
    @Res() res: Response,
  ): Promise<void> {
    const { filename, buffer } = await this.designsService.buildDesignZip(id);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${filename}"`,
    );
    res.setHeader('Content-Length', String(buffer.length));
    res.end(buffer);
  }

  /** Reemplaza por completo las colocaciones del diseño. */
  @Put(':id/placements')
  @RequirePermissions(Permissions.DesignsUpdate)
  setPlacements(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SetPlacementsDto,
  ): Promise<Design> {
    return this.designsService.setPlacements(id, dto);
  }

  /** Reencola la generación de renders (reintento tras fallos o rehacer). */
  @Post(':id/regenerate')
  @RequirePermissions(Permissions.DesignsUpdate)
  regenerate(@Param('id', ParseUUIDPipe) id: string): Promise<Design> {
    return this.designsService.regenerate(id);
  }

  /** Regenera solo el SEO (texto/metadatos) con referencias, sin render. */
  @Post(':id/seo')
  @RequirePermissions(Permissions.DesignsUpdate)
  regenerateSeo(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RegenerateSeoDto,
  ): Promise<DesignSeoView | null> {
    return this.designsService.regenerateSeo(id, dto);
  }
}

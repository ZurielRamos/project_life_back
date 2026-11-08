import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { Permissions } from '../auth/permissions.enum';
import { CreateFitCategoryDto } from './dto/create-fit-category.dto';
import { CreateFitDto } from './dto/create-fit.dto';
import { ListFitCategoriesDto } from './dto/list-fit-categories.dto';
import { FitCategory } from './entities/fit-category.entity';
import { Fit } from './entities/fit.entity';
import { FitCategoriesService } from './fit-categories.service';

@Controller('fit-categories')
export class FitCategoriesController {
  constructor(private readonly fitCategoriesService: FitCategoriesService) {}

  /** Lista de ajustes administrables. */
  @Get('fits')
  @RequirePermissions(Permissions.FitCategoriesRead)
  listFits(): Promise<Fit[]> {
    return this.fitCategoriesService.listFits();
  }

  @Post('fits')
  @RequirePermissions(Permissions.FitCategoriesCreate)
  createFit(@Body() dto: CreateFitDto): Promise<Fit> {
    return this.fitCategoriesService.createFit(dto);
  }

  @Delete('fits/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions(Permissions.FitCategoriesDelete)
  async removeFit(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.fitCategoriesService.removeFit(id);
  }

  @Get()
  @RequirePermissions(Permissions.FitCategoriesRead)
  findAll(@Query() query: ListFitCategoriesDto): Promise<FitCategory[]> {
    return this.fitCategoriesService.findAll(query);
  }

  @Post()
  @RequirePermissions(Permissions.FitCategoriesCreate)
  create(@Body() dto: CreateFitCategoryDto): Promise<FitCategory> {
    return this.fitCategoriesService.create(dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions(Permissions.FitCategoriesDelete)
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.fitCategoriesService.remove(id);
  }
}

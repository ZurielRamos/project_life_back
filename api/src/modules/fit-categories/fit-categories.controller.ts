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
import type { ProductFit } from '../products/entities/product.entity';
import { CreateFitCategoryDto } from './dto/create-fit-category.dto';
import { ListFitCategoriesDto } from './dto/list-fit-categories.dto';
import { FitCategory } from './entities/fit-category.entity';
import { FitCategoriesService } from './fit-categories.service';

@Controller('fit-categories')
export class FitCategoriesController {
  constructor(private readonly fitCategoriesService: FitCategoriesService) {}

  /** Lista de ajustes válidos (enum fijo). */
  @Get('fits')
  @RequirePermissions(Permissions.FitCategoriesRead)
  listFits(): ProductFit[] {
    return this.fitCategoriesService.listFits();
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

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
} from '@nestjs/common';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { Permissions } from '../auth/permissions.enum';
import { CreateFontDto } from './dto/create-font.dto';
import { Font } from './entities/font.entity';
import { FontsService } from './fonts.service';

@Controller('fonts')
export class FontsController {
  constructor(private readonly fontsService: FontsService) {}

  @Get()
  @RequirePermissions(Permissions.FontsRead)
  findAll(): Promise<Font[]> {
    return this.fontsService.findAll();
  }

  @Post()
  @RequirePermissions(Permissions.FontsCreate)
  create(@Body() dto: CreateFontDto): Promise<Font> {
    return this.fontsService.create(dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions(Permissions.FontsDelete)
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.fontsService.remove(id);
  }
}

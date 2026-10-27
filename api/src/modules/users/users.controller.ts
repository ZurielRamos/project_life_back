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
} from '@nestjs/common';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { Permissions } from '../auth/permissions.enum';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { toUserView, UserView } from './users.presenter';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @RequirePermissions(Permissions.UsersCreate)
  async create(@Body() dto: CreateUserDto): Promise<UserView> {
    return toUserView(await this.usersService.create(dto));
  }

  @Get()
  @RequirePermissions(Permissions.UsersRead)
  async findAll(): Promise<UserView[]> {
    const users = await this.usersService.findAll();
    return users.map(toUserView);
  }

  @Get(':id')
  @RequirePermissions(Permissions.UsersRead)
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<UserView> {
    return toUserView(await this.usersService.findOne(id));
  }

  @Patch(':id')
  @RequirePermissions(Permissions.UsersUpdate)
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserDto,
  ): Promise<UserView> {
    return toUserView(await this.usersService.update(id, dto));
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions(Permissions.UsersDelete)
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.usersService.remove(id);
  }
}

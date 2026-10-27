import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Permission } from '../permissions/entities/permission.entity';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { Role } from './entities/role.entity';

@Injectable()
export class RolesService {
  constructor(
    @InjectRepository(Role)
    private readonly rolesRepository: Repository<Role>,
    @InjectRepository(Permission)
    private readonly permissionsRepository: Repository<Permission>,
  ) {}

  async create(dto: CreateRoleDto): Promise<Role> {
    const existing = await this.rolesRepository.findOne({
      where: { name: dto.name },
    });
    if (existing) {
      throw new BadRequestException('Ya existe un rol con ese nombre');
    }

    const role = this.rolesRepository.create({
      name: dto.name,
      description: dto.description ?? null,
      permissions: await this.resolvePermissions(dto.permissionIds),
    });

    const saved = await this.rolesRepository.save(role);
    return this.findOne(saved.id);
  }

  findAll(): Promise<Role[]> {
    return this.rolesRepository.find({ relations: { permissions: true } });
  }

  async findOne(id: string): Promise<Role> {
    const role = await this.rolesRepository.findOne({
      where: { id },
      relations: { permissions: true },
    });
    if (!role) {
      throw new NotFoundException('Rol no encontrado');
    }
    return role;
  }

  async update(id: string, dto: UpdateRoleDto): Promise<Role> {
    const role = await this.findOne(id);

    if (role.isSystem && dto.name && dto.name !== role.name) {
      throw new ForbiddenException(
        'No se puede renombrar un rol del sistema',
      );
    }

    if (dto.name && dto.name !== role.name) {
      const nameTaken = await this.rolesRepository.findOne({
        where: { name: dto.name },
      });
      if (nameTaken) {
        throw new BadRequestException('Ya existe un rol con ese nombre');
      }
      role.name = dto.name;
    }

    if (dto.description !== undefined) {
      role.description = dto.description ?? null;
    }

    if (dto.permissionIds) {
      role.permissions = await this.resolvePermissions(dto.permissionIds);
    }

    await this.rolesRepository.save(role);
    return this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    const role = await this.findOne(id);
    if (role.isSystem) {
      throw new ForbiddenException('No se puede eliminar un rol del sistema');
    }
    await this.rolesRepository.remove(role);
  }

  private async resolvePermissions(ids?: string[]): Promise<Permission[]> {
    if (!ids || ids.length === 0) {
      return [];
    }
    const permissions = await this.permissionsRepository.find({
      where: { id: In(ids) },
    });
    if (permissions.length !== ids.length) {
      throw new BadRequestException('Uno o más permisos no existen');
    }
    return permissions;
  }
}

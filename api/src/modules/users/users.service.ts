import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { In, Repository } from 'typeorm';
import { Role } from '../roles/entities/role.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { User } from './entities/user.entity';

const BCRYPT_ROUNDS = 10;

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    @InjectRepository(Role)
    private readonly rolesRepository: Repository<Role>,
  ) {}

  async create(dto: CreateUserDto): Promise<User> {
    const existing = await this.usersRepository.findOne({
      where: { email: dto.email },
    });
    if (existing) {
      throw new BadRequestException('El email ya está registrado');
    }

    const roles = await this.resolveRoles(dto.roleIds);
    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);

    const user = this.usersRepository.create({
      email: dto.email,
      name: dto.name ?? null,
      password: passwordHash,
      roles,
    });

    const saved = await this.usersRepository.save(user);
    return this.findOne(saved.id);
  }

  findAll(): Promise<User[]> {
    return this.usersRepository.find({ relations: { roles: true } });
  }

  async findOne(id: string): Promise<User> {
    const user = await this.usersRepository.findOne({
      where: { id },
      relations: { roles: true },
    });
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }
    return user;
  }

  /** Incluye el hash de password; usado por el flujo de login. */
  findByEmailWithPassword(email: string): Promise<User | null> {
    return this.usersRepository.findOne({
      where: { email },
      select: {
        id: true,
        email: true,
        name: true,
        password: true,
        isActive: true,
      },
    });
  }

  /** Carga el usuario con roles y permisos anidados; usado por JwtStrategy. */
  findByIdWithPermissions(id: string): Promise<User | null> {
    return this.usersRepository.findOne({
      where: { id },
      relations: { roles: { permissions: true } },
    });
  }

  async update(id: string, dto: UpdateUserDto): Promise<User> {
    const user = await this.findOne(id);

    if (dto.email && dto.email !== user.email) {
      const emailTaken = await this.usersRepository.findOne({
        where: { email: dto.email },
      });
      if (emailTaken) {
        throw new BadRequestException('El email ya está registrado');
      }
      user.email = dto.email;
    }

    if (dto.name !== undefined) {
      user.name = dto.name ?? null;
    }

    if (dto.password) {
      user.password = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
    }

    if (dto.isActive !== undefined) {
      user.isActive = dto.isActive;
    }

    if (dto.roleIds) {
      user.roles = await this.resolveRoles(dto.roleIds);
    }

    await this.usersRepository.save(user);
    return this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    const user = await this.findOne(id);
    await this.usersRepository.remove(user);
  }

  private async resolveRoles(roleIds?: string[]): Promise<Role[]> {
    if (!roleIds || roleIds.length === 0) {
      return [];
    }
    const roles = await this.rolesRepository.find({
      where: { id: In(roleIds) },
    });
    if (roles.length !== roleIds.length) {
      throw new BadRequestException('Uno o más roles no existen');
    }
    return roles;
  }
}

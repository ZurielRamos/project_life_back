import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Permission } from './entities/permission.entity';

@Injectable()
export class PermissionsService {
  constructor(
    @InjectRepository(Permission)
    private readonly permissionsRepository: Repository<Permission>,
  ) {}

  findAll(): Promise<Permission[]> {
    return this.permissionsRepository.find({ order: { name: 'ASC' } });
  }
}

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Permission } from '../../modules/permissions/entities/permission.entity';
import { Role } from '../../modules/roles/entities/role.entity';
import { User } from '../../modules/users/entities/user.entity';
import { SeedService } from './seed.service';

@Module({
  imports: [TypeOrmModule.forFeature([Permission, Role, User])],
  providers: [SeedService],
  exports: [SeedService],
})
export class SeedModule {}

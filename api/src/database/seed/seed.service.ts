import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { In, Repository } from 'typeorm';
import { ALL_PERMISSIONS } from '../../modules/auth/permissions.enum';
import { Permission } from '../../modules/permissions/entities/permission.entity';
import { Role } from '../../modules/roles/entities/role.entity';
import { User } from '../../modules/users/entities/user.entity';

/**
 * Siembra idempotente del esquema de autorización:
 *  1. Inserta/actualiza todos los permisos del catálogo central.
 *  2. Crea (o completa) el rol de sistema "admin" con TODOS los permisos.
 *  3. Crea el usuario administrador inicial si no existe.
 *
 * Es seguro ejecutarlo múltiples veces.
 */
@Injectable()
export class SeedService {
  private readonly logger = new Logger(SeedService.name);

  constructor(
    @InjectRepository(Permission)
    private readonly permissionsRepository: Repository<Permission>,
    @InjectRepository(Role)
    private readonly rolesRepository: Repository<Role>,
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    private readonly configService: ConfigService,
  ) {}

  async run(): Promise<void> {
    const permissions = await this.seedPermissions();
    const adminRole = await this.seedAdminRole(permissions);
    await this.seedAdminUser(adminRole);
    this.logger.log('Seed completado.');
  }

  private async seedPermissions(): Promise<Permission[]> {
    for (const name of ALL_PERMISSIONS) {
      const [resource, action] = name.split(':');
      const existing = await this.permissionsRepository.findOne({
        where: { name },
      });
      if (!existing) {
        await this.permissionsRepository.save(
          this.permissionsRepository.create({
            name,
            resource,
            action,
            description: `Permite ${action} sobre ${resource}`,
          }),
        );
        this.logger.log(`Permiso creado: ${name}`);
      }
    }
    return this.permissionsRepository.find();
  }

  private async seedAdminRole(permissions: Permission[]): Promise<Role> {
    let role = await this.rolesRepository.findOne({
      where: { name: 'admin' },
      relations: { permissions: true },
    });

    if (!role) {
      role = this.rolesRepository.create({
        name: 'admin',
        description: 'Rol con acceso total al sistema',
        isSystem: true,
      });
    }

    // Garantiza que admin siempre tenga TODOS los permisos actuales.
    role.permissions = permissions;
    role.isSystem = true;
    const saved = await this.rolesRepository.save(role);
    this.logger.log(
      `Rol "admin" sincronizado con ${permissions.length} permisos.`,
    );
    return saved;
  }

  private async seedAdminUser(adminRole: Role): Promise<void> {
    const email =
      this.configService.get<string>('ADMIN_EMAIL') ?? 'admin@kult.local';
    const password =
      this.configService.get<string>('ADMIN_PASSWORD') ?? 'changeme123';

    const existing = await this.usersRepository.findOne({
      where: { email },
    });
    if (existing) {
      this.logger.log(`Usuario admin ya existe: ${email}`);
      return;
    }

    const user = this.usersRepository.create({
      email,
      name: 'Administrador',
      password: await bcrypt.hash(password, 10),
      isActive: true,
      roles: [adminRole],
    });
    await this.usersRepository.save(user);
    this.logger.log(
      `Usuario admin creado: ${email} (cambia la contraseña cuanto antes)`,
    );
  }

  /** Helper por si se quiere limpiar permisos obsoletos (no usado por defecto). */
  async pruneObsoletePermissions(): Promise<void> {
    const obsolete = await this.permissionsRepository.find({
      where: { name: In([]) },
    });
    if (obsolete.length) {
      await this.permissionsRepository.remove(obsolete);
    }
  }
}

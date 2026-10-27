import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UsersService } from '../../users/users.service';
import { AuthenticatedUser } from '../interfaces/authenticated-user.interface';
import { JwtPayload } from '../interfaces/jwt-payload.interface';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly configService: ConfigService,
    private readonly usersService: UsersService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET') ?? 'change_me',
    });
  }

  /**
   * passport-jwt ya validó firma y expiración. Aquí cargamos el usuario
   * con sus roles y permisos para adjuntarlo a request.user. Resolver los
   * permisos en cada request garantiza que los cambios de rol apliquen
   * de inmediato sin necesidad de reemitir el token.
   */
  async validate(payload: JwtPayload): Promise<AuthenticatedUser> {
    const user = await this.usersService.findByIdWithPermissions(payload.sub);

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Usuario no válido o inactivo');
    }

    const roles = user.roles ?? [];
    const permissions = new Set<string>();
    for (const role of roles) {
      for (const permission of role.permissions ?? []) {
        permissions.add(permission.name);
      }
    }

    return {
      id: user.id,
      email: user.email,
      roles: roles.map((role) => role.name),
      permissions: Array.from(permissions),
    };
  }
}

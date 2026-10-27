import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../decorators/require-permissions.decorator';
import { Permissions } from '../permissions.enum';
import { AuthenticatedUser } from '../interfaces/authenticated-user.interface';

/**
 * Verifica que el usuario autenticado posea TODOS los permisos
 * declarados con @RequirePermissions(). Debe ejecutarse después del
 * JwtAuthGuard (que puebla request.user con los permisos resueltos).
 */
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<Permissions[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    // Sin permisos declarados => basta con estar autenticado.
    if (!required || required.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user: AuthenticatedUser | undefined = request.user;

    if (!user) {
      throw new ForbiddenException('Usuario no autenticado');
    }

    const granted = new Set(user.permissions ?? []);
    const missing = required.filter((perm) => !granted.has(perm));

    if (missing.length > 0) {
      throw new ForbiddenException(
        `Permisos insuficientes. Faltan: ${missing.join(', ')}`,
      );
    }

    return true;
  }
}

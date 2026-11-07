import { ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * Guard que exige una sesión de CLIENTE (estrategia `jwt-customer`). Se
 * aplica explícitamente con @UseGuards en rutas de cliente; los controladores
 * de cliente van marcados @Public() para que el guard global de admin no
 * intente validarlos con la estrategia de administración.
 */
@Injectable()
export class CustomerJwtGuard extends AuthGuard('jwt-customer') {
  handleRequest<TUser = unknown>(err: unknown, user: unknown): TUser {
    if (err || !user) {
      throw (
        (err as Error) ??
        new UnauthorizedException('Sesión de cliente requerida')
      );
    }
    return user as TUser;
  }
}

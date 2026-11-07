import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AuthenticatedCustomer } from '../interfaces/customer-jwt.interface';

/** Inyecta el cliente autenticado (request.user) en rutas con CustomerJwtGuard. */
export const CurrentCustomer = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthenticatedCustomer => {
    const request = ctx.switchToHttp().getRequest();
    return request.user as AuthenticatedCustomer;
  },
);

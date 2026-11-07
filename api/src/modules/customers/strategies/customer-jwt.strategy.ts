import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { CustomersService } from '../customers.service';
import { customerJwtSecret } from '../customer-auth.service';
import {
  AuthenticatedCustomer,
  CustomerJwtPayload,
} from '../interfaces/customer-jwt.interface';

/**
 * Estrategia JWT del dominio de CLIENTES. Nombre `jwt-customer` y secreto
 * propio para mantenerla aislada de la estrategia de administración `jwt`.
 */
@Injectable()
export class CustomerJwtStrategy extends PassportStrategy(
  Strategy,
  'jwt-customer',
) {
  constructor(
    config: ConfigService,
    private readonly customersService: CustomersService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: customerJwtSecret(config),
    });
  }

  async validate(payload: CustomerJwtPayload): Promise<AuthenticatedCustomer> {
    // Rechaza tokens que no sean de cliente (defensa en profundidad).
    if (payload.typ !== 'customer') {
      throw new UnauthorizedException('Token no válido');
    }
    const customer = await this.customersService.findActiveById(payload.sub);
    if (!customer) {
      throw new UnauthorizedException('Cliente no válido o inactivo');
    }
    return { id: customer.id, phone: customer.phone, name: customer.name };
  }
}

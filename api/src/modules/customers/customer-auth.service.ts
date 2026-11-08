import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { CustomersService } from './customers.service';
import { toCustomerView, CustomerView } from './customers.presenter';
import { RegisterCustomerDto } from './dto/register-customer.dto';
import { RequestOtpDto, VerifyOtpDto } from './dto/verify-otp.dto';
import { CustomerJwtPayload } from './interfaces/customer-jwt.interface';
import { StoreNotificationsService } from '../stores/store-notifications.service';
import { StoresService } from '../stores/stores.service';
import type { WhatsappAuthConfig } from '../../common/whatsapp-auth-template';
import { OtpVerifyResult, WhatsappOtpService } from './whatsapp-otp.service';

/** Datos de la petición que identifican a la tienda. */
export interface StoreContext {
  /** Header `Origin` (lo envía el navegador). */
  origin?: string;
  /** Header `x-store-slug`: solo se usa si el Origin no es de una tienda. */
  storeSlug?: string;
}

export interface CustomerAuthResult {
  accessToken: string;
  customer: CustomerView;
}

/** Respuesta del primer paso (se envió el OTP). */
export interface OtpRequestedResult {
  otpSent: true;
  /** Celular normalizado al que se envió el código. */
  phone: string;
}

/**
 * Resultado de verificar el OTP: o el cliente ya existía y se inicia sesión,
 * o es un número nuevo y debe completar sus datos con el `registrationToken`.
 */
export type VerifyOtpResult =
  | ({ status: 'authenticated' } & CustomerAuthResult)
  | { status: 'registration_required'; registrationToken: string };

/** Vigencia del token que permite completar el registro tras el OTP. */
const REGISTRATION_TOKEN_TTL = '15m';

/** Secreto propio del dominio de clientes; distinto del de admin. */
export function customerJwtSecret(config: ConfigService): string {
  return (
    config.get<string>('CUSTOMER_JWT_SECRET') ??
    config.get<string>('JWT_SECRET') ??
    'change_me_customer'
  );
}

@Injectable()
export class CustomerAuthService {
  constructor(
    private readonly customersService: CustomersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly otpService: WhatsappOtpService,
    private readonly storeNotifications: StoreNotificationsService,
    private readonly storesService: StoresService,
  ) {}

  /**
   * Paso 1: envía un OTP por WhatsApp al número, exista o no una cuenta. Si
   * hay una cuenta desactivada se rechaza de una vez para no gastar mensajes.
   */
  async requestOtp(
    dto: RequestOtpDto,
    ctx: StoreContext,
  ): Promise<OtpRequestedResult> {
    const storeId = await this.resolveStoreId(ctx);
    const phone = this.customersService.normalizePhone(dto.phone);
    if (phone.length < 7) {
      throw new BadRequestException('El número de celular no es válido');
    }
    const existing = await this.customersService.findByPhone(storeId, phone);
    if (existing && !existing.isActive) {
      throw new UnauthorizedException('La cuenta está desactivada');
    }
    // Si la tienda tiene WhatsApp propio conectado, el código sale por ahí;
    // si no, por las credenciales globales del .env.
    const credentials = await this.storeCredentials(storeId);
    await this.otpService.sendCode('auth', phone, null, credentials, storeId);
    return { otpSent: true, phone };
  }

  /**
   * Tienda a la que pertenece la petición: por el host del `Origin` (que el
   * navegador envía siempre y no se puede falsear desde una web) y, si ese
   * host no es de ninguna tienda (localhost, previews), por el slug que manda
   * el front. Sin tienda no se puede registrar ni autenticar a nadie.
   */
  private async resolveStoreId(ctx: StoreContext): Promise<string> {
    let host: string | null = null;
    try {
      host = ctx.origin ? new URL(ctx.origin).hostname : null;
    } catch {
      host = null;
    }
    const store = await this.storesService.findActiveByContext(
      host,
      ctx.storeSlug,
    );
    if (!store) {
      throw new BadRequestException('No se pudo identificar la tienda.');
    }
    return store.id;
  }

  /**
   * Credenciales de WhatsApp de la tienda. Cualquier fallo devuelve null: se
   * usan las credenciales globales en lugar de bloquear el acceso.
   */
  private async storeCredentials(
    storeId: string,
  ): Promise<WhatsappAuthConfig | null> {
    try {
      return await this.storeNotifications.getWhatsappCredentialsByStoreId(
        storeId,
      );
    } catch {
      return null;
    }
  }

  /**
   * Paso 2: verifica el OTP. Si el cliente existe devuelve la sesión; si no,
   * un `registrationToken` para capturar sus datos.
   */
  async verifyOtp(
    dto: VerifyOtpDto,
    ctx: StoreContext,
  ): Promise<VerifyOtpResult> {
    const storeId = await this.resolveStoreId(ctx);
    const phone = this.customersService.normalizePhone(dto.phone);
    const result = await this.otpService.verifyCode(
      'auth',
      phone,
      dto.code,
      storeId,
    );
    this.assertOtpOk(result);

    const customer = await this.customersService.findByPhone(storeId, phone);
    if (customer) {
      if (!customer.isActive) {
        throw new UnauthorizedException('La cuenta está desactivada');
      }
      return {
        status: 'authenticated',
        ...this.buildResult(customer.id, customer.phone, customer),
      };
    }

    const registrationToken = this.jwtService.sign(
      { sub: phone, sid: storeId, typ: 'customer-registration' },
      {
        secret: customerJwtSecret(this.configService),
        expiresIn: REGISTRATION_TOKEN_TTL,
      },
    );
    return { status: 'registration_required', registrationToken };
  }

  /**
   * Paso 3 (solo clientes nuevos): crea la cuenta con los datos capturados.
   * El celular sale del token, que solo se emite tras verificar el OTP.
   */
  async register(dto: RegisterCustomerDto): Promise<CustomerAuthResult> {
    let phone: string;
    let storeId: string;
    try {
      const payload = this.jwtService.verify<{
        sub: string;
        sid?: string;
        typ: string;
      }>(dto.registrationToken, {
        secret: customerJwtSecret(this.configService),
      });
      if (payload.typ !== 'customer-registration' || !payload.sid) {
        throw new Error('tipo de token inválido');
      }
      phone = payload.sub;
      // La tienda sale del token (la verificó el OTP), no de la petición.
      storeId = payload.sid;
    } catch {
      throw new UnauthorizedException(
        'La verificación expiró. Vuelve a verificar tu número.',
      );
    }

    const customer = await this.customersService.register(storeId, phone, dto);
    return this.buildResult(customer.id, customer.phone, customer);
  }

  // -------------------------------------------------------------------------
  // Helpers
  // -------------------------------------------------------------------------

  /** Traduce el resultado de la verificación a excepciones HTTP claras. */
  private assertOtpOk(
    result: OtpVerifyResult,
  ): asserts result is { ok: true; payload: string | null } {
    if (result.ok) return;
    switch (result.reason) {
      case 'not_found':
        throw new BadRequestException(
          'El código expiró o no existe. Solicita uno nuevo.',
        );
      case 'too_many_attempts':
        throw new BadRequestException(
          'Demasiados intentos. Solicita un código nuevo.',
        );
      case 'mismatch':
      default:
        throw new BadRequestException('El código no es correcto.');
    }
  }

  private buildResult(
    id: string,
    phone: string,
    entity: Parameters<typeof toCustomerView>[0],
  ): CustomerAuthResult {
    const payload: CustomerJwtPayload = { sub: id, phone, typ: 'customer' };
    const accessToken = this.jwtService.sign(payload, {
      secret: customerJwtSecret(this.configService),
      expiresIn:
        this.configService.get<string>('CUSTOMER_JWT_EXPIRES_IN') ?? '30d',
    });
    return { accessToken, customer: toCustomerView(entity) };
  }
}

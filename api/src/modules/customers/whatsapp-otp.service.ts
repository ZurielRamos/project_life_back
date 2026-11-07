import {
  BadRequestException,
  Injectable,
  Logger,
  OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

/**
 * Propósito del OTP. Cada propósito vive en su propio espacio de claves en
 * Redis para que un código de registro no pueda usarse para iniciar sesión
 * (ni al revés).
 */
export type OtpPurpose = 'auth';

/** Resultado de un intento de verificación. */
export type OtpVerifyResult =
  | { ok: true; payload: string | null }
  | { ok: false; reason: 'not_found' | 'mismatch' | 'too_many_attempts' };

interface StoredOtp {
  code: string;
  attempts: number;
  /** Payload opcional asociado (p.ej. datos del registro pendiente). */
  payload: string | null;
}

const OTP_TTL_SECONDS = 5 * 60; // 5 minutos de validez.
const RESEND_COOLDOWN_SECONDS = 30; // No reenviar antes de 30s.
const MAX_ATTEMPTS = 5; // Máximo de intentos por código.

/**
 * Genera y verifica OTPs enviados por WhatsApp a través de la API de
 * Strategee. Los códigos viven en Redis con TTL; cada número + propósito
 * tiene a lo sumo un código activo.
 */
@Injectable()
export class WhatsappOtpService implements OnModuleDestroy {
  private readonly logger = new Logger(WhatsappOtpService.name);
  private readonly redis: Redis;

  constructor(private readonly config: ConfigService) {
    this.redis = new Redis({
      host: config.get<string>('REDIS_HOST') ?? 'localhost',
      port: config.get<number>('REDIS_PORT') ?? 6379,
      username: config.get<string>('REDIS_USERNAME'),
      password: config.get<string>('REDIS_PASSWORD'),
      maxRetriesPerRequest: null,
      lazyConnect: false,
    });
    this.redis.on('error', (err) =>
      this.logger.error(`Redis (OTP) error: ${err.message}`),
    );
  }

  async onModuleDestroy(): Promise<void> {
    await this.redis.quit().catch(() => undefined);
  }

  private otpKey(purpose: OtpPurpose, phone: string): string {
    return `otp:${purpose}:${phone}`;
  }

  private cooldownKey(purpose: OtpPurpose, phone: string): string {
    return `otp:cooldown:${purpose}:${phone}`;
  }

  /** Código numérico de 6 dígitos. */
  private generateCode(): string {
    return String(Math.floor(100000 + Math.random() * 900000));
  }

  /**
   * Genera un OTP, lo guarda en Redis y lo envía por WhatsApp. Respeta un
   * cooldown para evitar spam de reenvíos. `payload` se guarda junto al código
   * y se devuelve intacto al verificar (lo usa el registro para no reenviar
   * todos los datos en el segundo paso).
   */
  async sendCode(
    purpose: OtpPurpose,
    phone: string,
    payload: string | null = null,
  ): Promise<void> {
    const cooldownKey = this.cooldownKey(purpose, phone);
    const onCooldown = await this.redis.get(cooldownKey);
    if (onCooldown) {
      throw new BadRequestException(
        'Espera unos segundos antes de solicitar otro código.',
      );
    }

    const code = this.generateCode();
    const stored: StoredOtp = { code, attempts: 0, payload };
    await this.redis.set(
      this.otpKey(purpose, phone),
      JSON.stringify(stored),
      'EX',
      OTP_TTL_SECONDS,
    );
    await this.redis.set(cooldownKey, '1', 'EX', RESEND_COOLDOWN_SECONDS);

    await this.deliver(phone, code);
  }

  /**
   * Verifica el código contra el guardado. Cuenta intentos y bloquea tras
   * demasiados fallos. Si es correcto, consume el código (one-time use).
   */
  async verifyCode(
    purpose: OtpPurpose,
    phone: string,
    code: string,
  ): Promise<OtpVerifyResult> {
    const key = this.otpKey(purpose, phone);
    const raw = await this.redis.get(key);
    if (!raw) {
      return { ok: false, reason: 'not_found' };
    }

    let stored: StoredOtp;
    try {
      stored = JSON.parse(raw) as StoredOtp;
    } catch {
      await this.redis.del(key);
      return { ok: false, reason: 'not_found' };
    }

    if (stored.attempts >= MAX_ATTEMPTS) {
      await this.redis.del(key);
      return { ok: false, reason: 'too_many_attempts' };
    }

    if (stored.code !== String(code).trim()) {
      stored.attempts += 1;
      // Conserva el TTL restante al reescribir.
      const ttl = await this.redis.ttl(key);
      await this.redis.set(
        key,
        JSON.stringify(stored),
        'EX',
        ttl > 0 ? ttl : OTP_TTL_SECONDS,
      );
      return { ok: false, reason: 'mismatch' };
    }

    // Correcto: consumir el código.
    await this.redis.del(key);
    return { ok: true, payload: stored.payload };
  }

  /** Envía el código por WhatsApp usando la plantilla de autenticación. */
  private async deliver(phone: string, code: string): Promise<void> {
    const baseUrl =
      this.config.get<string>('WHATSAPP_API_URL') ??
      'https://smarter.strategee.us/api/v1/strategeee/whatsapp/auth-template';
    const apiToken = this.config.get<string>('WHATSAPP_API_TOKEN');
    const inboxId = this.config.get<string>('WHATSAPP_INBOX_ID');
    const templateName =
      this.config.get<string>('WHATSAPP_TEMPLATE_NAME') ?? 'autenticacion';
    const languageCode =
      this.config.get<string>('WHATSAPP_LANGUAGE_CODE') ?? 'es';

    if (!apiToken || !inboxId) {
      // En desarrollo, sin credenciales configuradas, loguea el código en
      // lugar de fallar para no bloquear el flujo local.
      this.logger.warn(
        `WhatsApp no configurado (WHATSAPP_API_TOKEN/WHATSAPP_INBOX_ID). ` +
          `Código para ${phone}: ${code}`,
      );
      return;
    }

    const to = this.toWhatsappNumber(phone);
    const body = {
      inboxId,
      to,
      templateName,
      languageCode,
      code,
    };

    let res: Response;
    try {
      res = await fetch(baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-token': apiToken,
        },
        body: JSON.stringify(body),
      });
    } catch (err) {
      this.logger.error(
        `Fallo de red enviando OTP por WhatsApp: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
      throw new BadRequestException(
        'No se pudo enviar el código por WhatsApp. Intenta de nuevo.',
      );
    }

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      this.logger.error(
        `WhatsApp API respondió ${res.status}: ${text.slice(0, 500)}`,
      );
      throw new BadRequestException(
        'No se pudo enviar el código por WhatsApp. Verifica el número e intenta de nuevo.',
      );
    }
  }

  /**
   * Formatea el número para WhatsApp (con código de país). Los números
   * guardados llevan indicativo, salvo los colombianos de 10 dígitos
   * (móviles que empiezan por 3), que se guardan sin el 57.
   */
  private toWhatsappNumber(phone: string): string {
    const digits = phone.replace(/\D/g, '');
    if (digits.length === 10 && digits.startsWith('3')) return `57${digits}`;
    return digits;
  }
}

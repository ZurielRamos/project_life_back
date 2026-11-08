import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { createTransport } from 'nodemailer';
import { Repository } from 'typeorm';
import { assertPublicHost } from '../../common/net-guard';
import {
  decryptSecret,
  deriveKey,
  encryptSecret,
} from '../../common/secret-box';
import {
  buildWhatsappEndpoint,
  sendWhatsappAuthTemplate,
  WhatsappDeliveryError,
  type WhatsappAuthConfig,
} from '../../common/whatsapp-auth-template';
import { UpdateNotificationsDto } from './dto/update-notifications.dto';
import { StoreNotificationSettings } from './entities/store-notification-settings.entity';
import { Store } from './entities/store.entity';
import { StoresService } from './stores.service';

/** Vista de los ajustes para el admin: los secretos NUNCA se devuelven. */
export interface NotificationsView {
  smtp: {
    enabled: boolean;
    host: string;
    port: number;
    secure: boolean;
    username: string;
    fromName: string;
    fromEmail: string;
    /** true si hay una contraseña guardada (su valor no se expone). */
    hasPassword: boolean;
  };
  whatsapp: {
    enabled: boolean;
    apiUrl: string;
    accountSlug: string;
    channelId: string;
    templateName: string;
    languageCode: string;
    /** true si hay un token guardado (su valor no se expone). */
    hasApiToken: boolean;
    /** Endpoint resultante, para que el usuario compruebe la URL. */
    endpoint: string | null;
  };
  updatedAt: Date | null;
}

export interface TestResult {
  ok: true;
  message: string;
}

const HOSTNAME =
  /^(?=.{1,253}$)([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)*[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/;
/** Segundos mínimos entre pruebas de la misma tienda (evita usarlas para spam). */
const TEST_COOLDOWN_MS = 8_000;

const clean = (value: string | null | undefined): string | null => {
  const v = (value ?? '').trim();
  return v ? v : null;
};

@Injectable()
export class StoreNotificationsService {
  private readonly logger = new Logger(StoreNotificationsService.name);
  private readonly key: Buffer;
  private readonly allowPrivate: boolean;
  private readonly lastTest = new Map<string, number>();

  constructor(
    @InjectRepository(StoreNotificationSettings)
    private readonly settingsRepository: Repository<StoreNotificationSettings>,
    @InjectRepository(Store)
    private readonly storesRepository: Repository<Store>,
    private readonly storesService: StoresService,
    config: ConfigService,
  ) {
    const dedicated = config.get<string>('NOTIFICATIONS_SECRET');
    const secret = dedicated ?? config.get<string>('JWT_SECRET') ?? '';
    if (!dedicated) {
      this.logger.warn(
        'NOTIFICATIONS_SECRET no está definido: los secretos de notificaciones ' +
          'se cifran con JWT_SECRET. Si lo cambias, tendrás que volver a ' +
          'guardar las contraseñas y tokens.',
      );
    }
    this.key = deriveKey(secret);
    this.allowPrivate =
      config.get<string>('NOTIFICATIONS_ALLOW_PRIVATE_HOSTS') === 'true';
  }

  // ---------------------------------------------------------------------------
  // Lectura y actualización
  // ---------------------------------------------------------------------------

  async get(storeId: string): Promise<NotificationsView> {
    await this.assertStore(storeId);
    return this.toView(await this.find(storeId));
  }

  async update(
    storeId: string,
    dto: UpdateNotificationsDto,
  ): Promise<NotificationsView> {
    await this.assertStore(storeId);
    const row =
      (await this.find(storeId)) ?? this.settingsRepository.create({ storeId });

    const s = dto.smtp;
    if (s) {
      if (s.enabled !== undefined) row.smtpEnabled = s.enabled;
      if (s.host !== undefined) row.smtpHost = this.normalizeHost(s.host);
      if (s.port !== undefined) row.smtpPort = s.port;
      if (s.secure !== undefined) row.smtpSecure = s.secure;
      if (s.username !== undefined) row.smtpUsername = clean(s.username);
      if (s.fromName !== undefined) row.smtpFromName = clean(s.fromName);
      if (s.fromEmail !== undefined) {
        row.smtpFromEmail = clean(s.fromEmail)?.toLowerCase() ?? null;
      }
      if (s.clearPassword) row.smtpPasswordEnc = null;
      else if (clean(s.password)) {
        row.smtpPasswordEnc = encryptSecret(s.password as string, this.key);
      }
    }

    const w = dto.whatsapp;
    if (w) {
      if (w.enabled !== undefined) row.waEnabled = w.enabled;
      if (w.apiUrl !== undefined) row.waApiUrl = this.normalizeApiUrl(w.apiUrl);
      if (w.accountSlug !== undefined) {
        row.waAccountSlug = clean(w.accountSlug);
      }
      if (w.channelId !== undefined) row.waChannelId = clean(w.channelId);
      if (w.templateName !== undefined) {
        row.waTemplateName = clean(w.templateName);
      }
      if (w.languageCode !== undefined) {
        row.waLanguageCode = clean(w.languageCode) ?? 'es';
      }
      if (w.clearApiToken) row.waApiTokenEnc = null;
      else if (clean(w.apiToken)) {
        row.waApiTokenEnc = encryptSecret(w.apiToken as string, this.key);
      }
    }

    this.assertComplete(row);
    return this.toView(await this.settingsRepository.save(row));
  }

  // ---------------------------------------------------------------------------
  // Pruebas
  // ---------------------------------------------------------------------------

  /** Envía un correo de prueba con los ajustes SMTP guardados. */
  async testEmail(storeId: string, to: string): Promise<TestResult> {
    this.throttle(storeId, 'email');
    const store = await this.assertStore(storeId);
    const row = await this.find(storeId);
    if (!row?.smtpHost || !row.smtpFromEmail) {
      throw new BadRequestException(
        'Guarda primero el servidor SMTP y el correo remitente.',
      );
    }
    const password = row.smtpPasswordEnc
      ? decryptSecret(row.smtpPasswordEnc, this.key)
      : null;
    if (row.smtpPasswordEnc && password === null) {
      throw new BadRequestException(
        'No se pudo leer la contraseña guardada. Vuelve a escribirla y guarda.',
      );
    }

    await this.assertPublic(row.smtpHost);
    const transporter = createTransport({
      host: row.smtpHost,
      port: row.smtpPort,
      secure: row.smtpSecure,
      auth: row.smtpUsername
        ? { user: row.smtpUsername, pass: password ?? '' }
        : undefined,
      tls: { minVersion: 'TLSv1.2' },
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 15_000,
    });

    try {
      await transporter.sendMail({
        from: row.smtpFromName
          ? { name: row.smtpFromName, address: row.smtpFromEmail }
          : row.smtpFromEmail,
        to,
        subject: `Prueba de correo de ${store.name}`,
        text:
          `Este es un correo de prueba de la tienda ${store.name}.\n\n` +
          'Si lo recibes, la configuración SMTP funciona correctamente.',
      });
    } catch (err) {
      throw new BadRequestException(this.smtpErrorMessage(err));
    } finally {
      transporter.close();
    }
    return { ok: true, message: `Correo de prueba enviado a ${to}.` };
  }

  /** Envía la plantilla de autenticación a un número, con un código de ejemplo. */
  async testWhatsapp(storeId: string, phone: string): Promise<TestResult> {
    this.throttle(storeId, 'whatsapp');
    await this.assertStore(storeId);
    const row = await this.find(storeId);
    const cfg = row ? this.whatsappConfig(row) : null;
    if (!cfg) {
      throw new BadRequestException(
        'Guarda primero la URL, la cuenta, el canal, la plantilla y el token.',
      );
    }
    const digits = phone.replace(/\D/g, '');
    if (digits.length < 8 || digits.length > 15) {
      throw new BadRequestException('El número de celular no es válido.');
    }

    await this.assertPublic(new URL(cfg.endpoint).hostname);
    try {
      await sendWhatsappAuthTemplate(cfg, digits, '123456');
    } catch (err) {
      throw new BadRequestException(this.whatsappErrorMessage(err));
    }
    return {
      ok: true,
      message: `Mensaje de prueba enviado a +${digits} con el código de ejemplo 123456.`,
    };
  }

  // ---------------------------------------------------------------------------
  // Uso por otros módulos
  // ---------------------------------------------------------------------------

  /**
   * Credenciales de WhatsApp de la tienda a la que pertenece `host` (el host
   * desde el que el cliente usa la tienda). Devuelve null si la tienda no
   * existe, no tiene WhatsApp propio activo y completo, o el destino no es
   * seguro; el llamador entonces usa las credenciales globales.
   */
  async getWhatsappCredentialsByHost(
    host: string,
  ): Promise<WhatsappAuthConfig | null> {
    const store = await this.storesService.findPublicByHost(host);
    if (!store) return null;
    const entity = await this.storesRepository.findOne({
      where: { slug: store.slug },
      select: { id: true },
    });
    if (!entity) return null;
    return this.getWhatsappCredentialsByStoreId(entity.id, store.slug);
  }

  /**
   * Credenciales de WhatsApp de una tienda por id. Devuelve null si la tienda
   * no tiene WhatsApp conectado o su configuración está incompleta (el
   * llamador usa entonces las credenciales globales del .env).
   */
  async getWhatsappCredentialsByStoreId(
    storeId: string,
    label = storeId,
  ): Promise<WhatsappAuthConfig | null> {
    const row = await this.find(storeId);
    if (!row?.waEnabled) return null;
    const cfg = this.whatsappConfig(row);
    if (!cfg) return null;
    try {
      await this.assertPublic(new URL(cfg.endpoint).hostname);
    } catch (err) {
      this.logger.warn(
        `WhatsApp de la tienda ${label} descartado: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
      return null;
    }
    return cfg;
  }

  // ---------------------------------------------------------------------------
  // Internos
  // ---------------------------------------------------------------------------

  private async assertStore(storeId: string): Promise<Store> {
    const store = await this.storesRepository.findOne({
      where: { id: storeId },
    });
    if (!store) throw new NotFoundException('Tienda no encontrada');
    return store;
  }

  private find(storeId: string): Promise<StoreNotificationSettings | null> {
    return this.settingsRepository.findOne({ where: { storeId } });
  }

  private async assertPublic(hostname: string): Promise<void> {
    try {
      await assertPublicHost(hostname, this.allowPrivate);
    } catch (err) {
      const reason = err instanceof Error ? err.message : '';
      throw new BadRequestException(
        reason.includes('público')
          ? reason
          : `No se pudo resolver el servidor "${hostname}".`,
      );
    }
  }

  private throttle(storeId: string, kind: 'email' | 'whatsapp'): void {
    const key = `${storeId}:${kind}`;
    const now = Date.now();
    const last = this.lastTest.get(key) ?? 0;
    if (now - last < TEST_COOLDOWN_MS) {
      throw new BadRequestException(
        'Espera unos segundos antes de hacer otra prueba.',
      );
    }
    this.lastTest.set(key, now);
  }

  private normalizeHost(raw: string): string | null {
    const value = raw
      .trim()
      .toLowerCase()
      .replace(/^[a-z]+:\/\//, '')
      .replace(/[/:].*$/, '');
    if (!value) return null;
    if (!HOSTNAME.test(value)) {
      throw new BadRequestException('El servidor SMTP no es válido.');
    }
    return value;
  }

  /** Acepta solo https (http únicamente si se permiten hosts privados). */
  private normalizeApiUrl(raw: string): string | null {
    const value = raw.trim();
    if (!value) return null;
    let url: URL;
    try {
      url = new URL(value);
    } catch {
      throw new BadRequestException(
        'La URL de la API de WhatsApp no es válida.',
      );
    }
    const secure = url.protocol === 'https:';
    if (!secure && !(this.allowPrivate && url.protocol === 'http:')) {
      throw new BadRequestException(
        'La URL de la API de WhatsApp debe empezar por https://',
      );
    }
    if (url.username || url.password) {
      throw new BadRequestException(
        'La URL no debe incluir usuario ni contraseña.',
      );
    }
    return `${url.origin}${url.pathname.replace(/\/+$/, '')}`;
  }

  /** Si un canal está activo, exige que sus datos estén completos. */
  private assertComplete(row: StoreNotificationSettings): void {
    if (row.smtpEnabled) {
      if (!row.smtpHost || !row.smtpPort || !row.smtpFromEmail) {
        throw new BadRequestException(
          'Para activar el correo completa el servidor, el puerto y el correo remitente.',
        );
      }
      if (row.smtpUsername && !row.smtpPasswordEnc) {
        throw new BadRequestException('Indica la contraseña del usuario SMTP.');
      }
    }
    if (row.waEnabled) {
      if (
        !row.waApiUrl ||
        !row.waAccountSlug ||
        !row.waChannelId ||
        !row.waTemplateName ||
        !row.waApiTokenEnc
      ) {
        throw new BadRequestException(
          'Para activar WhatsApp completa la URL, la cuenta, el canal, la plantilla y el token.',
        );
      }
    }
  }

  private whatsappConfig(
    row: StoreNotificationSettings,
  ): WhatsappAuthConfig | null {
    if (
      !row.waApiUrl ||
      !row.waAccountSlug ||
      !row.waChannelId ||
      !row.waTemplateName ||
      !row.waApiTokenEnc
    ) {
      return null;
    }
    const apiToken = decryptSecret(row.waApiTokenEnc, this.key);
    if (!apiToken) {
      this.logger.error(
        `No se pudo descifrar el token de WhatsApp de la tienda ${row.storeId}`,
      );
      return null;
    }
    return {
      endpoint: buildWhatsappEndpoint(row.waApiUrl, row.waAccountSlug),
      apiToken,
      inboxId: row.waChannelId,
      templateName: row.waTemplateName,
      languageCode: row.waLanguageCode || 'es',
    };
  }

  private toView(row: StoreNotificationSettings | null): NotificationsView {
    return {
      smtp: {
        enabled: row?.smtpEnabled ?? false,
        host: row?.smtpHost ?? '',
        port: row?.smtpPort ?? 587,
        secure: row?.smtpSecure ?? false,
        username: row?.smtpUsername ?? '',
        fromName: row?.smtpFromName ?? '',
        fromEmail: row?.smtpFromEmail ?? '',
        hasPassword: Boolean(row?.smtpPasswordEnc),
      },
      whatsapp: {
        enabled: row?.waEnabled ?? false,
        apiUrl: row?.waApiUrl ?? '',
        accountSlug: row?.waAccountSlug ?? '',
        channelId: row?.waChannelId ?? '',
        templateName: row?.waTemplateName ?? 'autenticacion',
        languageCode: row?.waLanguageCode ?? 'es',
        hasApiToken: Boolean(row?.waApiTokenEnc),
        endpoint:
          row?.waApiUrl && row.waAccountSlug
            ? buildWhatsappEndpoint(row.waApiUrl, row.waAccountSlug)
            : null,
      },
      updatedAt: row?.updatedAt ?? null,
    };
  }

  private smtpErrorMessage(err: unknown): string {
    const code =
      typeof err === 'object' && err !== null && 'code' in err
        ? String((err as { code?: unknown }).code)
        : '';
    const detail = err instanceof Error ? err.message : String(err);
    this.logger.warn(`Prueba SMTP fallida (${code}): ${detail}`);

    // nodemailer agrupa varios errores de red bajo ESOCKET: se distingue por
    // el error real del sistema que trae el mensaje.
    if (
      /ECONNREFUSED|ENOTFOUND|EAI_AGAIN|EHOSTUNREACH|ENETUNREACH|ETIMEDOUT/.test(
        `${code} ${detail}`,
      )
    ) {
      return 'No se pudo conectar al servidor SMTP. Revisa el servidor y el puerto.';
    }
    switch (code) {
      case 'EAUTH':
        return 'El servidor rechazó el usuario o la contraseña.';
      case 'EENVELOPE':
        return 'El servidor rechazó el remitente o el destinatario.';
      case 'ECONNECTION':
      case 'EDNS':
        return 'No se pudo conectar al servidor SMTP. Revisa el servidor y el puerto.';
      case 'ESOCKET':
      case 'ETLS':
        return 'Falló la conexión segura. Revisa el puerto y la opción de conexión segura (SSL/TLS).';
      default:
        return 'No se pudo enviar el correo de prueba.';
    }
  }

  private whatsappErrorMessage(err: unknown): string {
    if (err instanceof WhatsappDeliveryError) {
      this.logger.warn(
        `Prueba de WhatsApp fallida (${err.status ?? 'sin respuesta'}): ${err.detail ?? err.message}`,
      );
      if (err.status === 401 || err.status === 403) {
        return 'La API rechazó las credenciales. Revisa el token y la cuenta.';
      }
      if (err.status === 404) {
        return 'No se encontró el endpoint. Revisa la URL de la API y el slug de la cuenta.';
      }
      if (err.status === 400 || err.status === 422) {
        return 'La API rechazó la solicitud. Revisa el canal, la plantilla y el número.';
      }
      if (err.status)
        return `La API de WhatsApp respondió con error (${err.status}).`;
      return 'No se pudo conectar con la API de WhatsApp. Revisa la URL.';
    }
    this.logger.warn(
      `Prueba de WhatsApp fallida: ${err instanceof Error ? err.message : String(err)}`,
    );
    return 'No se pudo enviar el mensaje de prueba.';
  }
}

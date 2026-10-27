import {
  BadRequestException,
  Injectable,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import SudoMock, {
  type CreateRenderParams,
  type ListMockupsParams,
  type Mockup,
  type MockupListResult,
  type RenderResult,
} from 'sudomock';

/** Una cuenta de SudoMock identificada por un alias. */
export interface SudomockAccount {
  /** Alias corto (p.ej. "trial1") usado como identificador. */
  id: string;
  /** Etiqueta para mostrar en UI (por defecto, el id). */
  label: string;
}

/**
 * Envoltura sobre el SDK de SudoMock con soporte para múltiples cuentas.
 *
 * Como el plan trial limita las plantillas por cuenta, se pueden declarar
 * varias cuentas (cada una con su API key) y el servicio mantiene un
 * cliente por cuenta. El resto de la app referencia cada cuenta por su
 * `accountId` (alias).
 *
 * Config (.env):
 *   SUDOMOCK_ACCOUNTS=trial1:sk_aaa,trial2:sk_bbb
 * Fallback (compatibilidad):
 *   SUDOMOCK_API_KEY=sk_xxx   -> cuenta con id "default"
 */
@Injectable()
export class SudomockService implements OnModuleInit {
  private readonly logger = new Logger(SudomockService.name);
  private readonly clients = new Map<string, SudoMock>();
  private readonly accounts: SudomockAccount[] = [];

  constructor(private readonly configService: ConfigService) {}

  onModuleInit(): void {
    const baseUrl = this.configService.get<string>('SUDOMOCK_BASE_URL');
    const options = baseUrl ? { baseUrl } : undefined;

    const raw = this.configService.get<string>('SUDOMOCK_ACCOUNTS');
    const parsed = this.parseAccounts(raw);

    // Fallback: una sola cuenta "default" con SUDOMOCK_API_KEY.
    if (parsed.length === 0) {
      const singleKey = this.configService.get<string>('SUDOMOCK_API_KEY');
      if (singleKey) {
        parsed.push({ id: 'default', apiKey: singleKey });
      }
    }

    for (const { id, apiKey } of parsed) {
      this.clients.set(id, new SudoMock(apiKey, options));
      this.accounts.push({ id, label: id });
    }

    if (this.accounts.length === 0) {
      this.logger.warn(
        'No hay cuentas de SudoMock configuradas (SUDOMOCK_ACCOUNTS / SUDOMOCK_API_KEY).',
      );
    } else {
      this.logger.log(
        `Cliente(s) SudoMock inicializado(s): ${this.accounts
          .map((a) => a.id)
          .join(', ')}`,
      );
    }
  }

  /** Parsea "alias:key,alias2:key2" en una lista de cuentas. */
  private parseAccounts(
    raw?: string,
  ): { id: string; apiKey: string }[] {
    if (!raw) return [];
    const result: { id: string; apiKey: string }[] = [];
    for (const entry of raw.split(',')) {
      const trimmed = entry.trim();
      if (!trimmed) continue;
      const sep = trimmed.indexOf(':');
      if (sep === -1) {
        this.logger.warn(
          `Entrada de SUDOMOCK_ACCOUNTS inválida (falta "alias:key"): "${trimmed}"`,
        );
        continue;
      }
      const id = trimmed.slice(0, sep).trim();
      const apiKey = trimmed.slice(sep + 1).trim();
      if (id && apiKey) {
        result.push({ id, apiKey });
      }
    }
    return result;
  }

  /** Lista las cuentas configuradas (sin exponer las API keys). */
  listAccounts(): SudomockAccount[] {
    return this.accounts;
  }

  /** Devuelve el cliente de una cuenta o lanza si no existe. */
  private clientFor(accountId: string): SudoMock {
    const client = this.clients.get(accountId);
    if (!client) {
      throw new BadRequestException(
        `Cuenta de SudoMock desconocida: "${accountId}"`,
      );
    }
    return client;
  }

  /** Lista las plantillas PSD de una cuenta. */
  listPsdMockups(
    accountId: string,
    params?: ListMockupsParams,
  ): Promise<MockupListResult> {
    return this.clientFor(accountId).psdMockups.list(params);
  }

  /** Obtiene una plantilla PSD de una cuenta por su uuid. */
  getPsdMockup(accountId: string, uuid: string): Promise<Mockup> {
    return this.clientFor(accountId).psdMockups.get(uuid);
  }

  /**
   * Renderiza un PSD mockup con artwork (síncrono). Devuelve el resultado
   * con la URL del render en el CDN de SudoMock.
   */
  renderPsdMockup(
    accountId: string,
    params: CreateRenderParams,
  ): Promise<RenderResult> {
    return this.clientFor(accountId).renders.create(params);
  }
}

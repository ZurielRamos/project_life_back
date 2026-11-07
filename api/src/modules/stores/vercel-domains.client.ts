import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/** Estado de un dominio en el proyecto de Vercel. */
export interface VercelDomainState {
  /** Vercel verificó la propiedad del dominio (no requiere TXT pendiente). */
  verified: boolean;
  /** Desafíos TXT pendientes cuando el dominio está en otra cuenta. */
  verification: { type: string; domain: string; value: string }[];
  /** Los DNS no apuntan a Vercel (o apuntan mal). */
  misconfigured: boolean;
  /** Valores recomendados por Vercel para este dominio. */
  recommendedCname: string | null;
  recommendedIpv4: string | null;
}

const API = 'https://api.vercel.com';
const DEFAULT_CNAME = 'cname.vercel-dns.com';
const DEFAULT_IPV4 = '76.76.21.21';

/**
 * Cliente mínimo de la API de dominios de Vercel. Vercel enruta el dominio al
 * proyecto del front y emite/renueva el certificado TLS (Let's Encrypt)
 * automáticamente cuando los DNS apuntan bien.
 */
@Injectable()
export class VercelDomainsClient {
  private readonly logger = new Logger(VercelDomainsClient.name);

  constructor(private readonly config: ConfigService) {}

  get enabled(): boolean {
    return Boolean(
      this.config.get<string>('VERCEL_API_TOKEN') &&
      this.config.get<string>('VERCEL_PROJECT_ID'),
    );
  }

  private get projectId(): string {
    return this.config.get<string>('VERCEL_PROJECT_ID') as string;
  }

  private url(path: string, extra?: Record<string, string>): string {
    const params = new URLSearchParams(extra);
    const team = this.config.get<string>('VERCEL_TEAM_ID');
    if (team) params.set('teamId', team);
    const qs = params.toString();
    return `${API}${path}${qs ? `?${qs}` : ''}`;
  }

  private async call(
    method: string,
    path: string,
    body?: unknown,
  ): Promise<{ status: number; json: any }> {
    if (!this.enabled) {
      throw new BadRequestException(
        'Dominios personalizados no configurados (VERCEL_API_TOKEN / VERCEL_PROJECT_ID)',
      );
    }
    const res = await fetch(this.url(path), {
      method,
      headers: {
        Authorization: `Bearer ${this.config.get<string>('VERCEL_API_TOKEN')}`,
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(15_000),
    });
    const json = await res.json().catch(() => ({}));
    return { status: res.status, json };
  }

  /** Agrega el dominio al proyecto (idempotente si ya está en este proyecto). */
  async addDomain(hostname: string): Promise<void> {
    const { status, json } = await this.call(
      'POST',
      `/v10/projects/${this.projectId}/domains`,
      { name: hostname },
    );
    if (status >= 200 && status < 300) return;
    const code: string | undefined = json?.error?.code;
    // Ya agregado a este mismo proyecto: se considera éxito.
    if (
      code === 'domain_already_in_use' &&
      json?.error?.projectId === this.projectId
    ) {
      return;
    }
    if (code === 'domain_already_in_use') {
      throw new BadRequestException(
        'Ese dominio ya está en uso en otro proyecto de Vercel',
      );
    }
    this.logger.error(
      `addDomain ${hostname}: ${status} ${JSON.stringify(json)}`,
    );
    throw new BadRequestException(
      json?.error?.message ?? 'No se pudo registrar el dominio en Vercel',
    );
  }

  /** Quita el dominio del proyecto. Ignora si ya no existe. */
  async removeDomain(hostname: string): Promise<void> {
    const { status, json } = await this.call(
      'DELETE',
      `/v9/projects/${this.projectId}/domains/${encodeURIComponent(hostname)}`,
    );
    if ((status >= 200 && status < 300) || status === 404) return;
    this.logger.error(
      `removeDomain ${hostname}: ${status} ${JSON.stringify(json)}`,
    );
    throw new BadRequestException(
      json?.error?.message ?? 'No se pudo quitar el dominio de Vercel',
    );
  }

  /** Consulta verificación y configuración DNS del dominio. */
  async getState(hostname: string): Promise<VercelDomainState> {
    const enc = encodeURIComponent(hostname);
    const [project, cfg] = await Promise.all([
      this.call('GET', `/v9/projects/${this.projectId}/domains/${enc}`),
      this.call('GET', `/v6/domains/${enc}/config`),
    ]);
    if (project.status === 404) {
      throw new BadRequestException('El dominio no existe en Vercel');
    }
    let verified: boolean = project.json?.verified === true;
    let verification: VercelDomainState['verification'] =
      project.json?.verification ?? [];

    // Intenta verificar si hay desafíos pendientes (p. ej. TXT ya creado).
    if (!verified) {
      const v = await this.call(
        'POST',
        `/v9/projects/${this.projectId}/domains/${enc}/verify`,
      );
      if (v.status >= 200 && v.status < 300) {
        verified = v.json?.verified === true;
        verification = v.json?.verification ?? verification;
      }
    }

    const cname: string | undefined = cfg.json?.recommendedCNAME?.find(
      (r: { rank: number }) => r.rank === 1,
    )?.value;
    const ipv4: string | undefined = cfg.json?.recommendedIPv4?.find(
      (r: { rank: number }) => r.rank === 1,
    )?.value?.[0];

    return {
      verified,
      verification,
      misconfigured: cfg.json?.misconfigured !== false,
      recommendedCname: cname ? cname.replace(/\.$/, '') : null,
      recommendedIpv4: ipv4 ?? null,
    };
  }

  static defaults(): { cname: string; ipv4: string } {
    return { cname: DEFAULT_CNAME, ipv4: DEFAULT_IPV4 };
  }
}

import { InjectQueue } from '@nestjs/bullmq';
import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  type OnModuleDestroy,
  type OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Queue } from 'bullmq';
import { IsNull, Not, Repository } from 'typeorm';
import { type DnsRecord, StoreDomain } from './entities/store-domain.entity';
import { Store } from './entities/store.entity';
import { STORE_DOMAINS_QUEUE } from './store-domains.queue';
import {
  VercelDomainsClient,
  type VercelDomainState,
} from './vercel-domains.client';

const MAX_DOMAINS_PER_STORE = 10;
/** Tras este plazo sin DNS correctos, el dominio pasa a "error". */
const PENDING_TIMEOUT_MS = 7 * 24 * 60 * 60 * 1000;
/** Re-chequeo de dominios activos para detectar DNS rotos más tarde. */
const ACTIVE_RECHECK_MS = 60 * 60 * 1000;
const CACHE_REFRESH_MS = 60 * 1000;

/** Sufijos de segundo nivel comunes (com.co, co.uk, com.mx...). */
const SECOND_LEVEL = new Set(['com', 'co', 'net', 'org', 'gov', 'edu', 'ac']);

/** Separa un host en dominio raíz (apex) y la parte de subdominio. */
export function splitHost(hostname: string): { apex: string; sub: string } {
  const labels = hostname.split('.');
  const n =
    labels.length >= 3 &&
    SECOND_LEVEL.has(labels[labels.length - 2]) &&
    labels[labels.length - 1].length === 2
      ? 3
      : 2;
  const apexLabels = labels.slice(-n);
  return { apex: apexLabels.join('.'), sub: labels.slice(0, -n).join('.') };
}

@Injectable()
export class StoreDomainsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(StoreDomainsService.name);

  /** hostname → storeId de dominios activos. Lectura sin ir a la BD. */
  private activeHosts = new Map<string, string>();
  /** storeId → hostname del dominio favorito activo (si lo hay). */
  private primaryHosts = new Map<string, string>();
  private timer?: NodeJS.Timeout;

  constructor(
    @InjectRepository(StoreDomain)
    private readonly domains: Repository<StoreDomain>,
    @InjectRepository(Store)
    private readonly stores: Repository<Store>,
    @InjectQueue(STORE_DOMAINS_QUEUE) private readonly queue: Queue,
    private readonly vercel: VercelDomainsClient,
    private readonly config: ConfigService,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.backfillLegacyDomains();
    await this.refreshCache();
    this.timer = setInterval(() => {
      this.refreshCache().catch((e) =>
        this.logger.warn(`refreshCache: ${String(e)}`),
      );
    }, CACHE_REFRESH_MS);
    this.timer.unref();

    // Job repetido (idempotente por jobId) que verifica DNS/SSL pendientes.
    if (this.vercel.enabled) {
      await this.queue.upsertJobScheduler(
        'store-domains-check-all',
        { every: 60_000 },
        {
          name: 'check-all',
          opts: { removeOnComplete: true, removeOnFail: 50 },
        },
      );
    }
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }

  // --- Lectura rápida (CORS / resolución por host) ---

  /** ¿Es un dominio propio activo de alguna tienda? (sin tocar la BD) */
  isActiveHost(hostname: string): boolean {
    return this.activeHosts.has(hostname.toLowerCase());
  }

  /** Id de la tienda dueña de un dominio propio activo. */
  storeIdForHost(hostname: string): string | undefined {
    return this.activeHosts.get(hostname.toLowerCase());
  }

  /** Hostname del dominio favorito activo de la tienda, o undefined. */
  primaryHostFor(storeId: string): string | undefined {
    return this.primaryHosts.get(storeId);
  }

  async refreshCache(): Promise<void> {
    const rows = await this.domains.find({
      where: { status: 'active' },
      select: { hostname: true, storeId: true, isPrimary: true },
    });
    this.activeHosts = new Map(rows.map((r) => [r.hostname, r.storeId]));
    this.primaryHosts = new Map(
      rows.filter((r) => r.isPrimary).map((r) => [r.storeId, r.hostname]),
    );
  }

  /**
   * Marca el dominio favorito de la tienda. `domainId = null` devuelve el
   * favorito al subdominio de la plataforma. Solo dominios activos.
   */
  async setPrimary(
    storeId: string,
    domainId: string | null,
  ): Promise<StoreDomain[]> {
    await this.assertStore(storeId);
    if (domainId) {
      const target = await this.domains.findOne({
        where: { id: domainId, storeId },
      });
      if (!target) throw new NotFoundException('Dominio no encontrado');
      if (target.status !== 'active') {
        throw new BadRequestException(
          'Solo un dominio activo puede ser el favorito',
        );
      }
    }
    await this.domains.update({ storeId }, { isPrimary: false });
    if (domainId) await this.domains.update({ id: domainId }, { isPrimary: true });
    await this.refreshCache();
    return this.list(storeId);
  }

  // --- API de administración ---

  async list(storeId: string): Promise<StoreDomain[]> {
    await this.assertStore(storeId);
    return this.domains.find({
      where: { storeId },
      order: { createdAt: 'ASC' },
    });
  }

  async add(storeId: string, rawHostname: string): Promise<StoreDomain> {
    await this.assertStore(storeId);
    const hostname = this.normalize(rawHostname);

    if (
      (await this.domains.count({ where: { storeId } })) >=
      MAX_DOMAINS_PER_STORE
    ) {
      throw new BadRequestException(
        `Máximo ${MAX_DOMAINS_PER_STORE} dominios por tienda`,
      );
    }
    if (await this.domains.exists({ where: { hostname } })) {
      throw new BadRequestException(
        'Ese dominio ya está asignado a una tienda',
      );
    }

    await this.vercel.addDomain(hostname);

    const { sub } = splitHost(hostname);
    const entity = this.domains.create({
      storeId,
      hostname,
      kind: sub ? 'subdomain' : 'apex',
      status: 'pending',
      sslStatus: 'pending',
      dnsRecords: this.buildRecords(hostname, null),
    });
    const saved = await this.domains.save(entity);
    // Primera verificación inmediata (puede que los DNS ya estén bien).
    return this.sync(saved.id);
  }

  async remove(storeId: string, domainId: string): Promise<void> {
    const domain = await this.domains.findOne({
      where: { id: domainId, storeId },
    });
    if (!domain) throw new NotFoundException('Dominio no encontrado');
    await this.vercel.removeDomain(domain.hostname);
    await this.domains.delete(domain.id);
    this.activeHosts.delete(domain.hostname);
    if (this.primaryHosts.get(domain.storeId) === domain.hostname) {
      this.primaryHosts.delete(domain.storeId);
    }
  }

  /**
   * Quita de Vercel todos los dominios de una tienda (antes de borrarla).
   * Si alguno falla, lanza error y la tienda no se elimina, para no dejar
   * dominios huérfanos ocupando cupo en el proyecto.
   */
  async removeAllForStore(storeId: string): Promise<void> {
    const rows = await this.domains.find({ where: { storeId } });
    for (const d of rows) {
      await this.vercel.removeDomain(d.hostname);
      this.activeHosts.delete(d.hostname);
    }
    this.primaryHosts.delete(storeId);
  }

  /** Verificación manual ("Verificar ahora"). */
  async verify(storeId: string, domainId: string): Promise<StoreDomain> {
    const domain = await this.domains.findOne({
      where: { id: domainId, storeId },
      select: { id: true },
    });
    if (!domain) throw new NotFoundException('Dominio no encontrado');
    return this.sync(domain.id);
  }

  // --- Verificación (manual y por job) ---

  /** Dominios que el job debe revisar ahora. */
  async checkDue(): Promise<void> {
    const rows = await this.domains.find();
    const now = Date.now();
    for (const d of rows) {
      const checkedAt = d.lastCheckedAt?.getTime() ?? 0;
      const due =
        d.status === 'pending' ||
        (d.status === 'active' && d.sslStatus === 'pending') ||
        (d.status === 'active' && now - checkedAt > ACTIVE_RECHECK_MS);
      if (!due) continue;
      try {
        await this.sync(d.id);
      } catch (e) {
        this.logger.warn(`sync ${d.hostname}: ${String(e)}`);
      }
    }
    await this.refreshCache();
  }

  /** Consulta a Vercel, recalcula estado/DNS/SSL y persiste. */
  async sync(domainId: string): Promise<StoreDomain> {
    const domain = await this.domains.findOne({ where: { id: domainId } });
    if (!domain) throw new NotFoundException('Dominio no encontrado');

    let state: VercelDomainState | null = null;
    try {
      state = await this.vercel.getState(domain.hostname);
      domain.lastError = null;
    } catch (e) {
      domain.lastError = e instanceof Error ? e.message : String(e);
    }
    domain.lastCheckedAt = new Date();

    if (state) {
      domain.dnsRecords = this.buildRecords(domain.hostname, state);
      const ok = state.verified && !state.misconfigured;
      if (ok) {
        domain.status = 'active';
        domain.verifiedAt ??= new Date();
        domain.sslStatus = (await this.probeTls(domain.hostname))
          ? 'issued'
          : 'pending';
      } else {
        domain.status = 'pending';
        domain.sslStatus = 'pending';
      }
    }

    if (
      domain.status === 'pending' &&
      Date.now() - domain.createdAt.getTime() > PENDING_TIMEOUT_MS
    ) {
      domain.status = 'error';
      domain.lastError ??=
        'Los DNS no se configuraron correctamente en 7 días. Revisa los registros y vuelve a verificar.';
    }

    const saved = await this.domains.save(domain);
    if (saved.status === 'active') {
      this.activeHosts.set(saved.hostname, saved.storeId);
      if (saved.isPrimary) this.primaryHosts.set(saved.storeId, saved.hostname);
    } else {
      this.activeHosts.delete(saved.hostname);
      if (this.primaryHosts.get(saved.storeId) === saved.hostname) {
        this.primaryHosts.delete(saved.storeId);
      }
    }
    return saved;
  }

  // --- Internos ---

  /** HTTPS responde con un certificado válido (cualquier respuesta HTTP sirve). */
  private async probeTls(hostname: string): Promise<boolean> {
    try {
      await fetch(`https://${hostname}`, {
        method: 'HEAD',
        redirect: 'manual',
        signal: AbortSignal.timeout(8_000),
      });
      return true;
    } catch {
      return false;
    }
  }

  private buildRecords(
    hostname: string,
    state: VercelDomainState | null,
  ): DnsRecord[] {
    const defaults = VercelDomainsClient.defaults();
    const { sub } = splitHost(hostname);
    const records: DnsRecord[] = [];

    if (!sub) {
      records.push({
        type: 'A',
        name: '@',
        value: state?.recommendedIpv4 ?? defaults.ipv4,
        purpose: 'routing',
      });
    } else {
      records.push({
        type: 'CNAME',
        name: sub,
        value: state?.recommendedCname ?? defaults.cname,
        purpose: 'routing',
      });
    }
    for (const v of state?.verification ?? []) {
      if (v.type.toUpperCase() !== 'TXT') continue;
      const { sub: txtSub } = splitHost(v.domain);
      records.push({
        type: 'TXT',
        name: txtSub || '@',
        value: v.value,
        purpose: 'verification',
      });
    }
    return records;
  }

  private normalize(raw: string): string {
    const value = (raw ?? '')
      .trim()
      .toLowerCase()
      .replace(/^https?:\/\//, '')
      .replace(/[/?#].*$/, '')
      .replace(/\.$/, '');
    const valid =
      /^(?=.{1,253}$)([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/.test(
        value,
      );
    if (!valid) throw new BadRequestException('El dominio no es válido');

    const base = this.config
      .get<string>('STORES_BASE_DOMAIN')
      ?.trim()
      .toLowerCase();
    if (base && (value === base || value.endsWith(`.${base}`))) {
      throw new BadRequestException(
        `Los dominios de ${base} se gestionan con el subdominio de la tienda`,
      );
    }
    return value;
  }

  private async assertStore(storeId: string): Promise<void> {
    if (!(await this.stores.exists({ where: { id: storeId } }))) {
      throw new NotFoundException('Tienda no encontrada');
    }
  }

  /** Migra el antiguo `stores.domain` (uno solo) a `store_domains`. */
  private async backfillLegacyDomains(): Promise<void> {
    const legacy = await this.stores.find({
      where: { domain: Not(IsNull()) },
      select: { id: true, domain: true },
    });
    for (const s of legacy) {
      const hostname = s.domain as string;
      try {
        if (!(await this.domains.exists({ where: { hostname } }))) {
          if (this.vercel.enabled) await this.vercel.addDomain(hostname);
          const { sub } = splitHost(hostname);
          await this.domains.save(
            this.domains.create({
              storeId: s.id,
              hostname,
              kind: sub ? 'subdomain' : 'apex',
              dnsRecords: this.buildRecords(hostname, null),
            }),
          );
        }
        await this.stores.update(s.id, { domain: null });
      } catch (e) {
        this.logger.warn(`backfill ${hostname}: ${String(e)}`);
      }
    }
  }
}

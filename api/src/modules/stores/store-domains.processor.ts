import { Processor, WorkerHost } from '@nestjs/bullmq';
import { StoreDomainsService } from './store-domains.service';
import { STORE_DOMAINS_QUEUE } from './store-domains.queue';

/** Verifica periódicamente DNS y certificados de los dominios de tiendas. */
@Processor(STORE_DOMAINS_QUEUE, { concurrency: 1 })
export class StoreDomainsProcessor extends WorkerHost {
  constructor(private readonly domains: StoreDomainsService) {
    super();
  }

  async process(): Promise<void> {
    await this.domains.checkDue();
  }
}

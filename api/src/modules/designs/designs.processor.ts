import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { DesignsService } from './designs.service';
import { DESIGN_QUEUE, type DesignJob } from './designs.queue';

/**
 * Worker de generación de renders. Concurrencia 1: SudoMock (trial) solo
 * admite una petición a la vez. Procesa un render por job y, al final,
 * un job 'finalize' que genera el SEO y marca el estado del diseño.
 */
@Processor(DESIGN_QUEUE, { concurrency: 1 })
export class DesignsProcessor extends WorkerHost {
  private readonly logger = new Logger(DesignsProcessor.name);

  constructor(private readonly designsService: DesignsService) {
    super();
  }

  async process(job: Job<DesignJob>): Promise<void> {
    const data = job.data;
    if (data.type === 'render') {
      await this.designsService.executeRenderJob(data.renderId);
      return;
    }
    if (data.type === 'finalize') {
      await this.designsService.finalizeDesign(data.designId);
      return;
    }
    this.logger.warn(`Job de tipo desconocido: ${JSON.stringify(data)}`);
  }
}

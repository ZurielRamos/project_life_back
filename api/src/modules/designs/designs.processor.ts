import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { DesignsService } from './designs.service';
import { DESIGN_QUEUE, type DesignJob } from './designs.queue';

/**
 * Worker de generación de renders. Concurrencia 3: la cuenta pro de SudoMock
 * admite hasta 3 renders simultáneos. Procesa un render por job y un job
 * 'finalize' que, al terminar TODOS los renders, genera el SEO y marca el
 * estado. Como ya no hay orden garantizado (concurrencia > 1), `finalize` se
 * re-encola a sí mismo mientras queden renders pendientes/en proceso.
 */
@Processor(DESIGN_QUEUE, { concurrency: 3 })
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

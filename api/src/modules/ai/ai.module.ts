import { Global, Module } from '@nestjs/common';
import { AiService } from './ai.service';

/**
 * Global para que cualquier módulo pueda inyectar AiService sin
 * reimportarlo. Envuelve OpenRouter (texto multimodal + embeddings).
 */
@Global()
@Module({
  providers: [AiService],
  exports: [AiService],
})
export class AiModule {}

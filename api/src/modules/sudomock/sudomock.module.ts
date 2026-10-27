import { Global, Module } from '@nestjs/common';
import { SudomockService } from './sudomock.service';

/**
 * Global para que cualquier módulo pueda inyectar SudomockService
 * sin reimportarlo. Solo expone el servicio; no tiene controladores.
 */
@Global()
@Module({
  providers: [SudomockService],
  exports: [SudomockService],
})
export class SudomockModule {}

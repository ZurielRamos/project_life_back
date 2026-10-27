import { Global, Module } from '@nestjs/common';
import { CloudinaryService } from './cloudinary.service';

/**
 * Global para que cualquier módulo pueda inyectar CloudinaryService
 * sin reimportarlo. Solo expone el servicio; no tiene controladores.
 */
@Global()
@Module({
  providers: [CloudinaryService],
  exports: [CloudinaryService],
})
export class CloudinaryModule {}

import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { AppModule } from '../../app.module';
import { SeedService } from './seed.service';

/**
 * Punto de entrada standalone del seed. Ejecuta:
 *   npm run seed
 * Arranca el contexto de Nest sin levantar el servidor HTTP,
 * corre el seed y cierra.
 */
async function bootstrap() {
  const logger = new Logger('Seed');
  const app = await NestFactory.createApplicationContext(AppModule);
  try {
    await app.get(SeedService).run();
    logger.log('Seed ejecutado correctamente.');
  } catch (error) {
    logger.error('Error ejecutando el seed', error as Error);
    process.exitCode = 1;
  } finally {
    await app.close();
  }
}

void bootstrap();

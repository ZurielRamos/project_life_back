import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bodyParser: false });
  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT') ?? 3000;

  // Límite ampliado: las imágenes de diseño llegan como data URI (base64).
  const { json, urlencoded } = await import('express');
  app.use(json({ limit: '15mb' }));
  app.use(urlencoded({ limit: '15mb', extended: true }));

  // CORS para permitir que el frontend (admin) consuma la API.
  // CORS_ORIGIN admite una lista separada por comas; por defecto, Vite dev.
  const corsOrigin = configService.get<string>('CORS_ORIGIN');
  app.enableCors({
    origin: corsOrigin
      ? corsOrigin.split(',').map((o) => o.trim())
      : ['http://localhost:5173'],
    credentials: true,
  });

  app.setGlobalPrefix('api');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // elimina propiedades no declaradas en el DTO
      forbidNonWhitelisted: true, // error si llegan propiedades extra
      transform: true, // convierte payloads a instancias de los DTO
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  await app.listen(port);
  console.log(`Aplicación corriendo en: http://localhost:${port}/api`);
}
bootstrap();

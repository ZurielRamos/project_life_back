import { join } from 'node:path';
import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ServeStaticModule } from '@nestjs/serve-static';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import databaseConfig from './config/database.config';
import { validateEnv } from './config/env.validation';
import { SeedModule } from './database/seed/seed.module';
import { AuthModule } from './modules/auth/auth.module';
import { CloudinaryModule } from './modules/cloudinary/cloudinary.module';
import { JwtAuthGuard } from './modules/auth/guards/jwt-auth.guard';
import { PermissionsGuard } from './modules/auth/guards/permissions.guard';
import { PermissionsModule } from './modules/permissions/permissions.module';
import { AiModule } from './modules/ai/ai.module';
import { DesignsModule } from './modules/designs/designs.module';
import { ProductsModule } from './modules/products/products.module';
import { RolesModule } from './modules/roles/roles.module';
import { StorefrontModule } from './modules/storefront/storefront.module';
import { SudomockModule } from './modules/sudomock/sudomock.module';
import { UsersModule } from './modules/users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      load: [databaseConfig],
      validate: validateEnv,
      envFilePath: ['.env'],
    }),
    // Sirve el build del admin (SPA) desde la misma API. La ruta se toma de
    // CLIENT_DIST_PATH; por defecto, la carpeta `client` junto al dist de la
    // API (donde el Dockerfile copia el build del admin). Se excluye /api*
    // para no interceptar las rutas de la API, y se activa el fallback a
    // index.html para que funcione el enrutado de React Router.
    ServeStaticModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => [
        {
          // __dirname en runtime = dist/ ; el build del admin se copia a
          // dist/client (ver Dockerfile). Configurable con CLIENT_DIST_PATH.
          rootPath:
            config.get<string>('CLIENT_DIST_PATH') ??
            join(__dirname, 'client'),
          exclude: ['/api*'],
          serveStaticOptions: { fallthrough: true },
        },
      ],
    }),
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: {
          host: config.get<string>('REDIS_HOST') ?? 'localhost',
          port: config.get<number>('REDIS_PORT') ?? 6379,
          username: config.get<string>('REDIS_USERNAME'),
          password: config.get<string>('REDIS_PASSWORD'),
        },
        defaultJobOptions: {
          attempts: 2,
          backoff: { type: 'exponential', delay: 3000 },
          removeOnComplete: 100,
          removeOnFail: 200,
        },
      }),
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get<string>('database.host'),
        port: config.get<number>('database.port'),
        username: config.get<string>('database.username'),
        password: config.get<string>('database.password'),
        database: config.get<string>('database.database'),
        autoLoadEntities: true,
        synchronize: config.get<boolean>('database.synchronize'),
        logging: config.get<boolean>('database.logging'),
        ssl: config.get<boolean>('database.ssl')
          ? { rejectUnauthorized: false }
          : false,
      }),
    }),
    SudomockModule,
    CloudinaryModule,
    AiModule,
    AuthModule,
    UsersModule,
    RolesModule,
    PermissionsModule,
    ProductsModule,
    DesignsModule,
    StorefrontModule,
    SeedModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // Orden importa: autenticación primero, luego autorización.
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: PermissionsGuard },
  ],
})
export class AppModule {}

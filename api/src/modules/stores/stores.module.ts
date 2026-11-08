import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Design } from '../designs/entities/design.entity';
import { Product } from '../products/entities/product.entity';
import { StoreDomain } from './entities/store-domain.entity';
import { StoreNotificationSettings } from './entities/store-notification-settings.entity';
import { Store } from './entities/store.entity';
import { StoreDomainsProcessor } from './store-domains.processor';
import { STORE_DOMAINS_QUEUE } from './store-domains.queue';
import { StoreDomainsService } from './store-domains.service';
import { StoreNotificationsController } from './store-notifications.controller';
import { StoreNotificationsService } from './store-notifications.service';
import { StoresController } from './stores.controller';
import { StoresService } from './stores.service';
import { VercelDomainsClient } from './vercel-domains.client';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Store,
      StoreDomain,
      StoreNotificationSettings,
      Product,
      Design,
    ]),
    BullModule.registerQueue({ name: STORE_DOMAINS_QUEUE }),
  ],
  controllers: [StoresController, StoreNotificationsController],
  providers: [
    StoresService,
    StoreNotificationsService,
    StoreDomainsService,
    StoreDomainsProcessor,
    VercelDomainsClient,
  ],
  exports: [StoresService, StoreDomainsService, StoreNotificationsService],
})
export class StoresModule {}

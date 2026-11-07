import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CustomersModule } from '../customers/customers.module';
import { DesignsModule } from '../designs/designs.module';
import { Design } from '../designs/entities/design.entity';
import { SettingsModule } from '../settings/settings.module';
import { StoresModule } from '../stores/stores.module';
import { CustomDesignController } from './custom-design.controller';
import { StorefrontController } from './storefront.controller';
import { StorefrontService } from './storefront.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Design]),
    DesignsModule,
    CustomersModule,
    SettingsModule,
    StoresModule,
  ],
  controllers: [StorefrontController, CustomDesignController],
  providers: [StorefrontService],
})
export class StorefrontModule {}

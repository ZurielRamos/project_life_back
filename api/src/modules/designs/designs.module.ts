import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FontsModule } from '../fonts/fonts.module';
import { PrintAreaCompatibility } from '../products/entities/print-area-compatibility.entity';
import { PrintArea } from '../products/entities/print-area.entity';
import { Product } from '../products/entities/product.entity';
import { DesignsController } from './designs.controller';
import { DesignsProcessor } from './designs.processor';
import { DESIGN_QUEUE } from './designs.queue';
import { DesignsService } from './designs.service';
import { DesignPlacement } from './entities/design-placement.entity';
import { DesignRender } from './entities/design-render.entity';
import { DesignSeo } from './entities/design-seo.entity';
import { Design } from './entities/design.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Design,
      DesignPlacement,
      DesignRender,
      DesignSeo,
      Product,
      PrintArea,
      PrintAreaCompatibility,
    ]),
    BullModule.registerQueue({ name: DESIGN_QUEUE }),
    FontsModule,
  ],
  controllers: [DesignsController],
  providers: [DesignsService, DesignsProcessor],
  exports: [DesignsService],
})
export class DesignsModule {}

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FitCategory } from '../fit-categories/entities/fit-category.entity';
import { Fit } from '../fit-categories/entities/fit.entity';
import { PhotoSession } from './entities/photo-session.entity';
import { PrintAreaCompatibility } from './entities/print-area-compatibility.entity';
import { PrintArea } from './entities/print-area.entity';
import { Product } from './entities/product.entity';
import { ProductColor } from './entities/product-color.entity';
import { ProductSize } from './entities/product-size.entity';
import { SessionMockup } from './entities/session-mockup.entity';
import { PrintAreaCompatibilityService } from './print-area-compatibility.service';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Product,
      ProductSize,
      ProductColor,
      PrintArea,
      PrintAreaCompatibility,
      PhotoSession,
      SessionMockup,
      FitCategory,
      Fit,
    ]),
  ],
  controllers: [ProductsController],
  providers: [ProductsService, PrintAreaCompatibilityService],
  exports: [ProductsService],
})
export class ProductsModule {}

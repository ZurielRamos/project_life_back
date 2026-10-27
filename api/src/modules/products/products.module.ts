import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PhotoSession } from './entities/photo-session.entity';
import { PrintArea } from './entities/print-area.entity';
import { Product } from './entities/product.entity';
import { ProductColor } from './entities/product-color.entity';
import { ProductSize } from './entities/product-size.entity';
import { SessionMockup } from './entities/session-mockup.entity';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Product,
      ProductSize,
      ProductColor,
      PrintArea,
      PhotoSession,
      SessionMockup,
    ]),
  ],
  controllers: [ProductsController],
  providers: [ProductsService],
  exports: [ProductsService],
})
export class ProductsModule {}

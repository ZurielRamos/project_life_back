import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Design } from '../designs/entities/design.entity';
import { StorefrontController } from './storefront.controller';
import { StorefrontService } from './storefront.service';

@Module({
  imports: [TypeOrmModule.forFeature([Design])],
  controllers: [StorefrontController],
  providers: [StorefrontService],
})
export class StorefrontModule {}

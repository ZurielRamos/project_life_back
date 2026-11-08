import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Product } from '../products/entities/product.entity';
import { FitCategory } from './entities/fit-category.entity';
import { Fit } from './entities/fit.entity';
import { FitCategoriesController } from './fit-categories.controller';
import { FitCategoriesService } from './fit-categories.service';

@Module({
  imports: [TypeOrmModule.forFeature([FitCategory, Fit, Product])],
  controllers: [FitCategoriesController],
  providers: [FitCategoriesService],
  exports: [FitCategoriesService],
})
export class FitCategoriesModule {}

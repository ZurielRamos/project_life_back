import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FitCategory } from './entities/fit-category.entity';
import { FitCategoriesController } from './fit-categories.controller';
import { FitCategoriesService } from './fit-categories.service';

@Module({
  imports: [TypeOrmModule.forFeature([FitCategory])],
  controllers: [FitCategoriesController],
  providers: [FitCategoriesService],
  exports: [FitCategoriesService],
})
export class FitCategoriesModule {}

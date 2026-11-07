import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Font } from './entities/font.entity';
import { FontsController } from './fonts.controller';
import { FontsService } from './fonts.service';

@Module({
  imports: [TypeOrmModule.forFeature([Font])],
  controllers: [FontsController],
  providers: [FontsService],
  exports: [FontsService],
})
export class FontsModule {}

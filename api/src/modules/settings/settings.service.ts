import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UpdateGenerationSettingsDto } from './dto/update-generation-settings.dto';
import { GenerationSettings } from './entities/generation-settings.entity';

const SINGLETON_ID = 'default';

@Injectable()
export class SettingsService {
  constructor(
    @InjectRepository(GenerationSettings)
    private readonly repo: Repository<GenerationSettings>,
  ) {}

  /** Devuelve la fila de ajustes, creándola con valores por defecto si falta. */
  async getGenerationSettings(): Promise<GenerationSettings> {
    let settings = await this.repo.findOne({ where: { id: SINGLETON_ID } });
    if (!settings) {
      settings = this.repo.create({ id: SINGLETON_ID });
      settings = await this.repo.save(settings);
    }
    return settings;
  }

  async updateGenerationSettings(
    dto: UpdateGenerationSettingsDto,
  ): Promise<GenerationSettings> {
    const settings = await this.getGenerationSettings();
    settings.maxColorGenerationsPerHour = dto.maxColorGenerationsPerHour;
    return this.repo.save(settings);
  }
}

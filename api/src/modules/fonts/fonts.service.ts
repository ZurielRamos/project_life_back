import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { CreateFontDto } from './dto/create-font.dto';
import { Font } from './entities/font.entity';

@Injectable()
export class FontsService {
  constructor(
    @InjectRepository(Font)
    private readonly fontsRepository: Repository<Font>,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  findAll(): Promise<Font[]> {
    return this.fontsRepository.find({ order: { family: 'ASC' } });
  }

  /** Devuelve las fuentes cuyas familias están en la lista (para render). */
  findByFamilies(families: string[]): Promise<Font[]> {
    if (families.length === 0) return Promise.resolve([]);
    return this.fontsRepository.find({ where: { family: In(families) } });
  }

  async create(dto: CreateFontDto): Promise<Font> {
    const family = dto.family.trim();
    const existing = await this.fontsRepository.findOne({ where: { family } });
    if (existing) {
      throw new BadRequestException('Ya existe una fuente con esa familia');
    }

    const uploaded = await this.cloudinaryService.uploadRaw(dto.dataUri, {
      folder: 'kult/fonts',
    });

    const font = this.fontsRepository.create({
      family,
      fileUrl: uploaded.url,
      filePublicId: uploaded.publicId,
      format: dto.format ?? null,
    });
    return this.fontsRepository.save(font);
  }

  async remove(id: string): Promise<void> {
    const font = await this.fontsRepository.findOne({ where: { id } });
    if (!font) {
      throw new NotFoundException('Fuente no encontrada');
    }
    await this.cloudinaryService
      .deleteRawByPublicId(font.filePublicId)
      .catch(() => undefined);
    await this.fontsRepository.remove(font);
  }
}

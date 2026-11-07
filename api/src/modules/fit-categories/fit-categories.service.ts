import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  PRODUCT_FITS,
  type ProductFit,
} from '../products/entities/product.entity';
import { CreateFitCategoryDto } from './dto/create-fit-category.dto';
import { ListFitCategoriesDto } from './dto/list-fit-categories.dto';
import { FitCategory } from './entities/fit-category.entity';

@Injectable()
export class FitCategoriesService {
  constructor(
    @InjectRepository(FitCategory)
    private readonly fitCategoriesRepository: Repository<FitCategory>,
  ) {}

  /**
   * Lista las categorías ordenadas por posición. Si se pasa `fit`, filtra
   * solo las de ese ajuste.
   */
  findAll(query: ListFitCategoriesDto): Promise<FitCategory[]> {
    return this.fitCategoriesRepository.find({
      where: query.fit ? { fit: query.fit } : {},
      order: { fit: 'ASC', position: 'ASC' },
    });
  }

  async create(dto: CreateFitCategoryDto): Promise<FitCategory> {
    const name = dto.name.trim();
    if (!name) {
      throw new BadRequestException('El nombre es obligatorio');
    }

    const existing = await this.fitCategoriesRepository.findOne({
      where: { fit: dto.fit, name },
    });
    if (existing) {
      throw new BadRequestException(
        'Ya existe una categoría con ese nombre para este ajuste',
      );
    }

    const max = await this.fitCategoriesRepository
      .createQueryBuilder('fc')
      .select('MAX(fc.position)', 'max')
      .where('fc.fit = :fit', { fit: dto.fit })
      .getRawOne<{ max: number | null }>();
    const position = (max?.max ?? -1) + 1;

    const category = this.fitCategoriesRepository.create({
      fit: dto.fit,
      name,
      position,
    });
    return this.fitCategoriesRepository.save(category);
  }

  async remove(id: string): Promise<void> {
    const category = await this.fitCategoriesRepository.findOne({
      where: { id },
    });
    if (!category) {
      throw new NotFoundException('Categoría de ajuste no encontrada');
    }
    await this.fitCategoriesRepository.remove(category);
  }

  /** Expone la lista de ajustes válidos (enum fijo) para el frontend. */
  listFits(): ProductFit[] {
    return [...PRODUCT_FITS];
  }
}

import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DEFAULT_FITS, Product } from '../products/entities/product.entity';
import { CreateFitCategoryDto } from './dto/create-fit-category.dto';
import { CreateFitDto } from './dto/create-fit.dto';
import { ListFitCategoriesDto } from './dto/list-fit-categories.dto';
import { FitCategory } from './entities/fit-category.entity';
import { Fit } from './entities/fit.entity';

/** Convierte un nombre en slug ASCII: "Niños Pro" -> "ninos-pro". */
function slugify(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50);
}

@Injectable()
export class FitCategoriesService implements OnModuleInit {
  private readonly logger = new Logger(FitCategoriesService.name);

  constructor(
    @InjectRepository(FitCategory)
    private readonly fitCategoriesRepository: Repository<FitCategory>,
    @InjectRepository(Fit)
    private readonly fitsRepository: Repository<Fit>,
    @InjectRepository(Product)
    private readonly productsRepository: Repository<Product>,
  ) {}

  /**
   * Siembra los ajustes iniciales (Hombre, Mujer, ...) solo cuando la tabla
   * está vacía, para no resucitar ajustes que el admin haya eliminado.
   */
  async onModuleInit(): Promise<void> {
    try {
      if ((await this.fitsRepository.count()) > 0) return;
      await this.fitsRepository.save(
        DEFAULT_FITS.map((f, position) =>
          this.fitsRepository.create({ ...f, position }),
        ),
      );
      this.logger.log(`Ajustes iniciales creados: ${DEFAULT_FITS.length}`);
    } catch (err) {
      this.logger.error(
        `No se pudieron sembrar los ajustes: ${(err as Error).message}`,
      );
    }
  }

  // --- Ajustes (fits) ---

  listFits(): Promise<Fit[]> {
    return this.fitsRepository.find({
      order: { position: 'ASC', createdAt: 'ASC' },
    });
  }

  /** Lanza 400 si no existe un ajuste con esa clave. */
  async assertFitExists(key: string): Promise<void> {
    const exists = await this.fitsRepository.exist({ where: { key } });
    if (!exists) {
      throw new BadRequestException(`El ajuste "${key}" no existe`);
    }
  }

  async createFit(dto: CreateFitDto): Promise<Fit> {
    const name = dto.name.trim();
    if (!name) {
      throw new BadRequestException('El nombre es obligatorio');
    }
    const base = slugify(name);
    if (!base) {
      throw new BadRequestException('El nombre debe incluir letras o números');
    }

    const sameName = await this.fitsRepository
      .createQueryBuilder('f')
      .where('LOWER(f.name) = LOWER(:name)', { name })
      .getExists();
    if (sameName) {
      throw new ConflictException('Ya existe un ajuste con ese nombre');
    }

    // Garantiza clave única añadiendo sufijo si hace falta.
    let key = base;
    for (let i = 2; await this.fitsRepository.exist({ where: { key } }); i++) {
      key = `${base}-${i}`;
    }

    const max = await this.fitsRepository
      .createQueryBuilder('f')
      .select('MAX(f.position)', 'max')
      .getRawOne<{ max: number | null }>();
    const position = (max?.max ?? -1) + 1;

    return this.fitsRepository.save(
      this.fitsRepository.create({ key, name, position }),
    );
  }

  async removeFit(id: string): Promise<void> {
    const fit = await this.fitsRepository.findOne({ where: { id } });
    if (!fit) {
      throw new NotFoundException('Ajuste no encontrado');
    }
    const inUse = await this.productsRepository.count({
      where: { fit: fit.key },
    });
    if (inUse > 0) {
      throw new ConflictException(
        `No se puede eliminar: ${inUse} producto(s) usan este ajuste`,
      );
    }
    // Sus categorías no tienen sentido sin el ajuste.
    await this.fitCategoriesRepository.delete({ fit: fit.key });
    await this.fitsRepository.remove(fit);
  }

  // --- Categorías de ajuste ---

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
    await this.assertFitExists(dto.fit);

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
}

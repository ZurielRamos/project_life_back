import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { SetCompatibilitiesDto } from './dto/set-compatibilities.dto';
import { PrintAreaCompatibility } from './entities/print-area-compatibility.entity';
import { PrintArea } from './entities/print-area.entity';
import { Product } from './entities/product.entity';

/** Vínculo de compatibilidad visto desde un producto. */
export interface CompatibilityLinkView {
  printAreaId: string;
  compatiblePrintAreaId: string;
  compatibleProductId: string;
  compatibleProductName: string;
  compatibleAreaName: string;
}

/** Producto candidato (con sus áreas) para vincular compatibilidades. */
export interface CompatibilityOption {
  id: string;
  name: string;
  printAreas: { id: string; name: string }[];
}

@Injectable()
export class PrintAreaCompatibilityService {
  constructor(
    @InjectRepository(PrintAreaCompatibility)
    private readonly linksRepository: Repository<PrintAreaCompatibility>,
    @InjectRepository(PrintArea)
    private readonly areasRepository: Repository<PrintArea>,
    @InjectRepository(Product)
    private readonly productsRepository: Repository<Product>,
  ) {}

  /** Compatibilidades de las áreas del producto hacia otros productos. */
  async list(productId: string): Promise<CompatibilityLinkView[]> {
    await this.assertProduct(productId);
    const links = await this.linksRepository
      .createQueryBuilder('l')
      .innerJoinAndSelect('l.printArea', 'a')
      .innerJoinAndSelect('l.compatiblePrintArea', 'ca')
      .innerJoinAndSelect('ca.product', 'cp')
      .where('a.product_id = :productId', { productId })
      .orderBy('a.position', 'ASC')
      .addOrderBy('cp.name', 'ASC')
      .addOrderBy('ca.position', 'ASC')
      .getMany();
    return links.map((l) => ({
      printAreaId: l.printAreaId,
      compatiblePrintAreaId: l.compatiblePrintAreaId,
      compatibleProductId: l.compatiblePrintArea.productId,
      compatibleProductName: l.compatiblePrintArea.product.name,
      compatibleAreaName: l.compatiblePrintArea.name,
    }));
  }

  /** Otros productos con sus áreas, para elegir con cuáles vincular. */
  async options(productId: string): Promise<CompatibilityOption[]> {
    await this.assertProduct(productId);
    const products = await this.productsRepository.find({
      relations: { printAreas: true },
      order: { name: 'ASC' },
    });
    return products
      .filter((p) => p.id !== productId && (p.printAreas ?? []).length > 0)
      .map((p) => ({
        id: p.id,
        name: p.name,
        printAreas: [...p.printAreas]
          .sort((a, b) => a.position - b.position)
          .map((a) => ({ id: a.id, name: a.name })),
      }));
  }

  /**
   * Reemplaza por completo los vínculos de las áreas del producto. Cada
   * vínculo se guarda en ambos sentidos (la relación es simétrica).
   */
  async replace(
    productId: string,
    dto: SetCompatibilitiesDto,
  ): Promise<CompatibilityLinkView[]> {
    await this.assertProduct(productId);
    const mine = await this.areasRepository.find({ where: { productId } });
    const mineIds = new Set(mine.map((a) => a.id));

    const unique = new Map<string, { a: string; b: string }>();
    for (const link of dto.links) {
      unique.set(`${link.printAreaId}:${link.compatiblePrintAreaId}`, {
        a: link.printAreaId,
        b: link.compatiblePrintAreaId,
      });
    }
    const links = [...unique.values()];

    for (const { a } of links) {
      if (!mineIds.has(a)) {
        throw new BadRequestException(
          'Un área indicada no pertenece a este producto',
        );
      }
    }
    const others = links.length
      ? await this.areasRepository.find({
          where: { id: In(links.map((l) => l.b)) },
        })
      : [];
    const otherById = new Map(others.map((o) => [o.id, o]));
    for (const { b } of links) {
      const other = otherById.get(b);
      if (!other) {
        throw new BadRequestException('Un área compatible no existe');
      }
      if (other.productId === productId) {
        throw new BadRequestException(
          'La compatibilidad es entre áreas de productos distintos',
        );
      }
    }

    // Borra todo vínculo que toque áreas de este producto (en ambos sentidos)
    // y vuelve a crear el conjunto indicado, también en ambos sentidos.
    const ids = [...mineIds];
    if (ids.length > 0) {
      await this.linksRepository.delete({ printAreaId: In(ids) });
      await this.linksRepository.delete({ compatiblePrintAreaId: In(ids) });
    }
    const rows = links.flatMap(({ a, b }) => [
      this.linksRepository.create({ printAreaId: a, compatiblePrintAreaId: b }),
      this.linksRepository.create({ printAreaId: b, compatiblePrintAreaId: a }),
    ]);
    if (rows.length > 0) {
      await this.linksRepository.upsert(rows, [
        'printAreaId',
        'compatiblePrintAreaId',
      ]);
    }
    return this.list(productId);
  }

  private async assertProduct(productId: string): Promise<void> {
    const exists = await this.productsRepository.exist({
      where: { id: productId },
    });
    if (!exists) throw new NotFoundException('Producto no encontrado');
  }
}

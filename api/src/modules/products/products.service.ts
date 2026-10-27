import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { Mockup as SudomockMockup } from 'sudomock';
import {
  SudomockAccount,
  SudomockService,
} from '../sudomock/sudomock.service';
import { CreateProductDto } from './dto/create-product.dto';
import { ImportSessionMockupsDto } from './dto/import-session-mockups.dto';
import { ListRemoteMockupsDto } from './dto/list-remote-mockups.dto';
import { PhotoSessionInputDto } from './dto/photo-session.dto';
import { ReorderMockupsDto } from './dto/reorder-mockups.dto';
import { SetColorsDto } from './dto/set-colors.dto';
import { SetPrintAreasDto } from './dto/set-print-areas.dto';
import { SetSizesDto } from './dto/set-sizes.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { PhotoSession } from './entities/photo-session.entity';
import { PrintArea } from './entities/print-area.entity';
import { Product } from './entities/product.entity';
import { ProductColor } from './entities/product-color.entity';
import { ProductSize } from './entities/product-size.entity';
import { SessionMockup } from './entities/session-mockup.entity';

/** Plantilla remota etiquetada con la cuenta de SudoMock de origen. */
export type RemoteMockupItem = SudomockMockup & { accountId: string };

/** Resultado del catálogo remoto agregado (posiblemente de varias cuentas). */
export interface RemoteMockupListResult {
  mockups: RemoteMockupItem[];
  total: number;
  /** Cuentas de SudoMock disponibles, para que el frontend las ofrezca. */
  accounts: SudomockAccount[];
}

@Injectable()
export class ProductsService {
  private readonly logger = new Logger(ProductsService.name);

  constructor(
    @InjectRepository(Product)
    private readonly productsRepository: Repository<Product>,
    @InjectRepository(PhotoSession)
    private readonly sessionsRepository: Repository<PhotoSession>,
    @InjectRepository(SessionMockup)
    private readonly sessionMockupsRepository: Repository<SessionMockup>,
    @InjectRepository(PrintArea)
    private readonly printAreasRepository: Repository<PrintArea>,
    @InjectRepository(ProductSize)
    private readonly sizesRepository: Repository<ProductSize>,
    @InjectRepository(ProductColor)
    private readonly colorsRepository: Repository<ProductColor>,
    private readonly sudomockService: SudomockService,
  ) {}

  // --- Catálogo remoto (SudoMock) ---

  /**
   * Lista las plantillas PSD disponibles. Si `accountId` se especifica,
   * consulta solo esa cuenta; si no, agrega las plantillas de TODAS las
   * cuentas configuradas, etiquetando cada una con su `accountId`.
   * No persiste nada.
   */
  async listRemoteMockups(
    query: ListRemoteMockupsDto,
  ): Promise<RemoteMockupListResult> {
    const accounts = this.sudomockService.listAccounts();
    const targetIds = query.accountId
      ? [query.accountId]
      : accounts.map((a) => a.id);

    const params = {
      limit: query.limit,
      offset: query.offset,
      name: query.name,
    };

    // Consulta cada cuenta en paralelo y de forma aislada: si una falla
    // (key inválida, cuenta vacía, error de red), se omite esa cuenta sin
    // tumbar las demás.
    const results = await Promise.all(
      targetIds.map(async (accountId) => {
        try {
          const result = await this.sudomockService.listPsdMockups(
            accountId,
            params,
          );
          return { accountId, result };
        } catch (error) {
          this.logger.warn(
            `No se pudo listar SudoMock para la cuenta "${accountId}": ${
              (error as Error).message
            }`,
          );
          return null;
        }
      }),
    );

    const mockups: RemoteMockupItem[] = [];
    let total = 0;
    for (const entry of results) {
      if (!entry) continue;
      total += entry.result.total;
      for (const m of entry.result.mockups) {
        mockups.push({ ...m, accountId: entry.accountId });
      }
    }

    return { mockups, total, accounts };
  }

  // --- Productos ---

  async create(dto: CreateProductDto): Promise<Product> {
    const product = this.productsRepository.create({
      name: dto.name,
      description: dto.description ?? null,
    });

    if (dto.photoSessions?.length) {
      product.photoSessions = [];
      for (const sessionDto of dto.photoSessions) {
        product.photoSessions.push(await this.buildSession(sessionDto));
      }
    }

    const saved = await this.productsRepository.save(product);
    return this.findOne(saved.id);
  }

  findAll(): Promise<Product[]> {
    return this.productsRepository.find({
      relations: { photoSessions: true },
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string): Promise<Product> {
    const product = await this.productsRepository.findOne({
      where: { id },
      relations: {
        sizes: true,
        colors: true,
        printAreas: true,
        photoSessions: { mockups: true, printArea: true },
      },
      order: { photoSessions: { createdAt: 'ASC' } },
    });
    if (!product) {
      throw new NotFoundException('Producto no encontrado');
    }
    this.sortSessionMockups(product);
    product.sizes = this.sortByPosition(product.sizes);
    product.colors = this.sortByPosition(product.colors);
    product.printAreas = this.sortByPosition(product.printAreas);
    return product;
  }

  async update(id: string, dto: UpdateProductDto): Promise<Product> {
    const product = await this.findOne(id);

    if (dto.name !== undefined) product.name = dto.name;
    if (dto.description !== undefined) {
      product.description = dto.description ?? null;
    }
    if (dto.brand !== undefined) product.brand = dto.brand ?? null;
    if (dto.category !== undefined) product.category = dto.category ?? null;
    if (dto.composition !== undefined) {
      product.composition = dto.composition ?? null;
    }
    if (dto.careInstructions !== undefined) {
      product.careInstructions = dto.careInstructions ?? null;
    }
    if (dto.fit !== undefined) product.fit = dto.fit ?? null;
    if (dto.basePriceCents !== undefined) {
      product.basePriceCents = dto.basePriceCents ?? null;
    }
    if (dto.currency !== undefined) {
      product.currency = dto.currency ? dto.currency.toUpperCase() : null;
    }
    if (dto.sizeChartUnit !== undefined) {
      product.sizeChartUnit = dto.sizeChartUnit;
    }
    if (dto.sizeChartColumns !== undefined) {
      product.sizeChartColumns = dto.sizeChartColumns;
    }
    if (dto.modelInfo !== undefined) {
      product.modelInfo = {
        label: dto.modelInfo.label ?? null,
        heightCm: dto.modelInfo.heightCm ?? null,
        weightKg: dto.modelInfo.weightKg ?? null,
        wearingSize: dto.modelInfo.wearingSize ?? null,
      };
    }

    await this.productsRepository.save(product);
    return this.findOne(id);
  }

  // --- Tallas ---

  /**
   * Reemplaza por completo el conjunto de tallas del producto. Borra las
   * existentes e inserta las nuevas (evita el UPDATE a null que viola el
   * NOT NULL de la FK).
   */
  async setSizes(id: string, dto: SetSizesDto): Promise<Product> {
    await this.findOne(id); // valida existencia
    await this.sizesRepository.delete({ productId: id });
    if (dto.sizes.length) {
      const rows = dto.sizes.map((input, index) =>
        this.sizesRepository.create({
          productId: id,
          name: input.name,
          labelName: input.labelName ?? null,
          measurements: this.sanitizeMeasurements(input.measurements),
          position: index,
        }),
      );
      await this.sizesRepository.save(rows);
    }
    return this.findOne(id);
  }

  // --- Colores ---

  /** Reemplaza por completo el conjunto de colores del producto. */
  async setColors(id: string, dto: SetColorsDto): Promise<Product> {
    await this.findOne(id);
    await this.colorsRepository.delete({ productId: id });
    if (dto.colors.length) {
      const rows = dto.colors.map((input, index) =>
        this.colorsRepository.create({
          productId: id,
          name: input.name,
          hex: input.hex,
          position: index,
        }),
      );
      await this.colorsRepository.save(rows);
    }
    return this.findOne(id);
  }

  // --- Áreas de impresión ---

  /**
   * Reemplaza por completo el conjunto de áreas de impresión. Las sesiones
   * que apuntaban a un área eliminada quedan con print_area_id = null por
   * el ON DELETE SET NULL de la FK.
   */
  async setPrintAreas(id: string, dto: SetPrintAreasDto): Promise<Product> {
    await this.findOne(id);
    await this.printAreasRepository.delete({ productId: id });
    if (dto.printAreas.length) {
      const rows = dto.printAreas.map((input, index) =>
        this.printAreasRepository.create({
          productId: id,
          name: input.name,
          widthMm: input.widthMm ?? null,
          heightMm: input.heightMm ?? null,
          maxWidthMm: input.maxWidthMm ?? null,
          maxHeightMm: input.maxHeightMm ?? null,
          technique: input.technique ?? null,
          sudomockSmartObjectUuid: input.sudomockSmartObjectUuid ?? null,
          position: index,
        }),
      );
      await this.printAreasRepository.save(rows);
    }
    return this.findOne(id);
  }

  /** Normaliza un Record de medidas: descarta valores no numéricos. */
  private sanitizeMeasurements(
    measurements?: Record<string, number>,
  ): Record<string, number> {
    if (!measurements) return {};
    const clean: Record<string, number> = {};
    for (const [key, value] of Object.entries(measurements)) {
      const num = Number(value);
      if (!Number.isNaN(num)) {
        clean[key] = num;
      }
    }
    return clean;
  }

  async remove(id: string): Promise<void> {
    const product = await this.findOne(id);
    await this.productsRepository.remove(product);
  }

  // --- Sesiones de fotos ---

  async addSession(
    productId: string,
    dto: PhotoSessionInputDto,
  ): Promise<PhotoSession> {
    await this.findOne(productId); // valida que el producto existe
    await this.assertPrintAreaBelongs(productId, dto.printAreaId);
    const session = await this.buildSession(dto);
    session.productId = productId;
    session.printAreaId = dto.printAreaId ?? null;
    const saved = await this.sessionsRepository.save(session);
    return this.findSession(productId, saved.id);
  }

  /** Actualiza nombre/descripción/área de la sesión (no toca sus mockups). */
  async updateSession(
    productId: string,
    sessionId: string,
    dto: PhotoSessionInputDto,
  ): Promise<PhotoSession> {
    const session = await this.findSession(productId, sessionId);
    await this.assertPrintAreaBelongs(productId, dto.printAreaId);
    session.name = dto.name;
    session.description = dto.description ?? null;
    session.printAreaId = dto.printAreaId ?? null;
    await this.sessionsRepository.save(session);
    return this.findSession(productId, sessionId);
  }

  /**
   * Valida que el área de impresión (si se especifica) pertenezca al
   * producto. Lanza BadRequestException si no existe o es de otro producto.
   */
  private async assertPrintAreaBelongs(
    productId: string,
    printAreaId?: string | null,
  ): Promise<void> {
    if (!printAreaId) return;
    const area = await this.printAreasRepository.findOne({
      where: { id: printAreaId, productId },
    });
    if (!area) {
      throw new BadRequestException(
        'El área de impresión no existe o no pertenece a este producto',
      );
    }
  }

  async removeSession(productId: string, sessionId: string): Promise<void> {
    const session = await this.findSession(productId, sessionId);
    await this.sessionsRepository.remove(session);
  }

  async findSession(
    productId: string,
    sessionId: string,
  ): Promise<PhotoSession> {
    const session = await this.sessionsRepository.findOne({
      where: { id: sessionId, productId },
      relations: { mockups: true, printArea: true },
    });
    if (!session) {
      throw new NotFoundException('Sesión de fotos no encontrada');
    }
    session.mockups = this.sortItems(session.mockups);
    return session;
  }

  // --- Mockups de la sesión (importados de SudoMock) ---

  /**
   * Importa plantillas de SudoMock a una sesión y las añade al final,
   * preservando el orden del array recibido.
   */
  async importMockups(
    productId: string,
    sessionId: string,
    dto: ImportSessionMockupsDto,
  ): Promise<PhotoSession> {
    const session = await this.findSession(productId, sessionId);
    const accountId = dto.accountId ?? 'default';

    const startPosition = session.mockups.length;
    const imported: SessionMockup[] = [];
    for (let i = 0; i < dto.sudomockUuids.length; i++) {
      const remote = await this.fetchRemote(accountId, dto.sudomockUuids[i]);
      imported.push(
        this.buildMockup(remote, accountId, startPosition + i),
      );
    }

    session.mockups = [...session.mockups, ...imported];
    await this.sessionsRepository.save(session);
    return this.findSession(productId, sessionId);
  }

  /** Quita un mockup de la sesión y recompacta las posiciones. */
  async removeMockup(
    productId: string,
    sessionId: string,
    sessionMockupId: string,
  ): Promise<PhotoSession> {
    const session = await this.findSession(productId, sessionId);
    const target = session.mockups.find((m) => m.id === sessionMockupId);
    if (!target) {
      throw new NotFoundException('Mockup no encontrado en la sesión');
    }
    await this.sessionMockupsRepository.remove(target);

    // Recompacta posiciones de los restantes.
    const remaining = session.mockups
      .filter((m) => m.id !== sessionMockupId)
      .sort((a, b) => a.position - b.position);
    remaining.forEach((m, index) => (m.position = index));
    await this.sessionMockupsRepository.save(remaining);

    return this.findSession(productId, sessionId);
  }

  /** Reordena los mockups ya importados según la lista de ids recibida. */
  async reorderMockups(
    productId: string,
    sessionId: string,
    dto: ReorderMockupsDto,
  ): Promise<PhotoSession> {
    const session = await this.findSession(productId, sessionId);

    const byId = new Map(session.mockups.map((m) => [m.id, m]));
    if (
      dto.sessionMockupIds.length !== session.mockups.length ||
      dto.sessionMockupIds.some((id) => !byId.has(id))
    ) {
      throw new BadRequestException(
        'La lista debe contener exactamente los ids de los mockups de la sesión',
      );
    }

    dto.sessionMockupIds.forEach((id, index) => {
      const item = byId.get(id);
      if (item) item.position = index;
    });
    await this.sessionMockupsRepository.save(session.mockups);

    return this.findSession(productId, sessionId);
  }

  // --- Helpers ---

  /** Construye una PhotoSession (sin persistir), importando sus mockups. */
  private async buildSession(
    dto: PhotoSessionInputDto,
  ): Promise<PhotoSession> {
    const session = this.sessionsRepository.create({
      name: dto.name,
      description: dto.description ?? null,
    });

    const uuids = dto.sudomockUuids ?? [];
    const accountId = dto.accountId ?? 'default';
    const mockups: SessionMockup[] = [];
    for (let i = 0; i < uuids.length; i++) {
      const remote = await this.fetchRemote(accountId, uuids[i]);
      mockups.push(this.buildMockup(remote, accountId, i));
    }
    session.mockups = mockups;
    return session;
  }

  /** Trae una plantilla de SudoMock, con error claro si falla. */
  private async fetchRemote(
    accountId: string,
    uuid: string,
  ): Promise<SudomockMockup> {
    try {
      return await this.sudomockService.getPsdMockup(accountId, uuid);
    } catch (error) {
      throw new BadRequestException(
        `No se pudo importar la plantilla "${uuid}" de SudoMock: ${
          (error as Error).message
        }`,
      );
    }
  }

  /** Mapea una plantilla de SudoMock a un SessionMockup embebido. */
  private buildMockup(
    remote: SudomockMockup,
    accountId: string,
    position: number,
  ): SessionMockup {
    const item = new SessionMockup();
    item.sudomockUuid = remote.uuid;
    item.sudomockAccountId = accountId;
    item.sudomockName = remote.name ?? null;
    item.thumbnailUrl = remote.thumbnail ?? null;
    item.width = remote.width ?? null;
    item.height = remote.height ?? null;
    item.smartObjects = remote.smartObjects ?? [];
    item.textLayers = remote.textLayers ?? [];
    item.raw = remote as unknown as Record<string, unknown>;
    item.position = position;
    return item;
  }

  private sortSessionMockups(product: Product): void {
    for (const session of product.photoSessions ?? []) {
      session.mockups = this.sortItems(session.mockups);
    }
  }

  private sortItems(items: SessionMockup[]): SessionMockup[] {
    return (items ?? []).sort((a, b) => a.position - b.position);
  }

  /** Ordena en memoria cualquier colección con `position`. */
  private sortByPosition<T extends { position: number }>(items: T[]): T[] {
    return (items ?? []).sort((a, b) => a.position - b.position);
  }
}

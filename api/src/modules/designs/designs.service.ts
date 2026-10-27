import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  type OnModuleInit,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Queue } from 'bullmq';
import { DataSource, In, IsNull, Repository } from 'typeorm';
import type { SmartObject } from 'sudomock';
import { AiService, type GeneratedSeo } from '../ai/ai.service';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { SudomockService } from '../sudomock/sudomock.service';
import { PrintArea } from '../products/entities/print-area.entity';
import { Product } from '../products/entities/product.entity';
import { SessionMockup } from '../products/entities/session-mockup.entity';
import { DESIGN_QUEUE, type DesignJob } from './designs.queue';
import { GenerateDesignDto } from './dto/generate-design.dto';
import { PreviewDesignDto } from './dto/preview-design.dto';
import { RegenerateSeoDto } from './dto/regenerate-seo.dto';
import { SetPlacementsDto } from './dto/set-placements.dto';
import { UpdateDesignDto } from './dto/update-design.dto';
import { UploadImageDto } from './dto/upload-image.dto';
import { DesignPlacement } from './entities/design-placement.entity';
import { DesignRender } from './entities/design-render.entity';
import { DesignSeo } from './entities/design-seo.entity';
import { Design } from './entities/design.entity';
import type { UploadedImage } from '../cloudinary/cloudinary.service';

/** SEO generado y persistido para el diseño. */
export interface DesignSeoView {
  title: string;
  slug: string;
  metaTitle: string | null;
  metaDescription: string | null;
  description: string;
  keywords: string[];
  jsonLd: Record<string, unknown> | null;
  openGraph: Record<string, unknown> | null;
}

/** Resultado de una vista previa efímera (un render + SEO, sin persistir). */
export interface PreviewResult {
  printAreaId: string;
  /** URL del render del primer color (en Cloudinary, carpeta kult/renders). */
  imageUrl: string;
  seo: DesignSeoView | null;
}

@Injectable()
export class DesignsService implements OnModuleInit {
  private readonly logger = new Logger(DesignsService.name);

  constructor(
    @InjectRepository(Design)
    private readonly designsRepository: Repository<Design>,
    @InjectRepository(DesignPlacement)
    private readonly placementsRepository: Repository<DesignPlacement>,
    @InjectRepository(DesignSeo)
    private readonly seoRepository: Repository<DesignSeo>,
    @InjectRepository(DesignRender)
    private readonly rendersRepository: Repository<DesignRender>,
    @InjectQueue(DESIGN_QUEUE)
    private readonly designQueue: Queue<DesignJob>,
    private readonly dataSource: DataSource,
    private readonly aiService: AiService,
    @InjectRepository(Product)
    private readonly productsRepository: Repository<Product>,
    @InjectRepository(PrintArea)
    private readonly printAreasRepository: Repository<PrintArea>,
    private readonly cloudinaryService: CloudinaryService,
    private readonly sudomockService: SudomockService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Crea el diseño (estado "generating"), guarda sus placements y planifica
   * los renders (uno por área × sesión anclada × color activo). Encola los
   * jobs y devuelve el diseño inmediatamente; el render ocurre en segundo
   * plano (worker con concurrencia 1).
   */
  async generate(dto: GenerateDesignDto): Promise<Design> {
    const product = await this.productsRepository.findOne({
      where: { id: dto.productId },
      relations: {
        printAreas: true,
        colors: true,
        photoSessions: { mockups: true },
      },
    });
    if (!product) {
      throw new BadRequestException('El producto no existe');
    }
    if (dto.placements.length === 0) {
      throw new BadRequestException('El diseño no tiene imágenes colocadas');
    }

    // Valida que las áreas de las placements pertenezcan al producto.
    const areaById = new Map((product.printAreas ?? []).map((a) => [a.id, a]));
    for (const p of dto.placements) {
      if (!areaById.has(p.printAreaId)) {
        throw new BadRequestException(
          'Una o más áreas de impresión no pertenecen al producto',
        );
      }
    }

    // Colores a renderizar (en orden). Vacío => un render sin color.
    const colorById = new Map((product.colors ?? []).map((c) => [c.id, c]));
    const colorTargets =
      dto.colorIds && dto.colorIds.length > 0
        ? dto.colorIds.map((id) => colorById.get(id)).filter((c) => !!c)
        : [null];

    // Planifica los renders: por cada área con placements, su sesión anclada
    // (con mockups), cada mockup y cada color.
    const areasWithImages = [
      ...new Set(dto.placements.map((p) => p.printAreaId)),
    ];
    const plannedRenders: Partial<DesignRender>[] = [];
    let pos = 0;
    for (const areaId of areasWithImages) {
      const area = areaById.get(areaId)!;
      // Sesiones candidatas: ancladas a esta área y con al menos un mockup.
      const candidateSessions = (product.photoSessions ?? []).filter(
        (s) => s.printAreaId === areaId && (s.mockups ?? []).length > 0,
      );
      if (candidateSessions.length === 0) continue; // sin sesión: no se renderiza
      // Elige una sesión aleatoria entre las candidatas del área.
      const session =
        candidateSessions[
          Math.floor(Math.random() * candidateSessions.length)
        ];
      for (const mockup of session.mockups) {
        for (const color of colorTargets) {
          plannedRenders.push({
            printAreaId: area.id,
            printAreaName: area.name,
            sessionId: session.id,
            sessionName: session.name,
            sessionMockupId: mockup.id,
            sudomockUuid: mockup.sudomockUuid,
            colorId: color?.id ?? null,
            colorName: color?.name ?? null,
            colorHex: color?.hex ?? null,
            status: 'pending',
            position: pos++,
          });
        }
      }
    }

    if (plannedRenders.length === 0) {
      throw new BadRequestException(
        'No hay sesiones con mockups ancladas a las áreas con imágenes',
      );
    }

    // Crea el diseño con placements y renders pendientes en una transacción.
    const design = this.designsRepository.create({
      name: 'Generando…',
      productId: dto.productId,
      code: await this.generateUniqueCode(),
      status: 'generating',
      placements: dto.placements.map((p, i) =>
        this.placementsRepository.create({
          printAreaId: p.printAreaId,
          imageUrl: p.imageUrl,
          imagePublicId: p.imagePublicId ?? null,
          xMm: p.xMm,
          yMm: p.yMm,
          widthMm: p.widthMm,
          heightMm: p.heightMm,
          rotation: p.rotation ?? 0,
          zIndex: p.zIndex ?? i,
        }),
      ),
      renders: plannedRenders.map((r) => this.rendersRepository.create(r)),
    });
    const saved = await this.designsRepository.save(design);

    await this.enqueueRenders(saved.id);
    return this.findOne(saved.id);
  }

  /** Encola un job por cada render pendiente + el job de finalización. */
  private async enqueueRenders(designId: string): Promise<void> {
    const pending = await this.rendersRepository.find({
      where: { designId, status: 'pending' },
      order: { position: 'ASC' },
    });
    for (const render of pending) {
      await this.designQueue.add('render', {
        type: 'render',
        designId,
        renderId: render.id,
      });
    }
    // El job de finalización corre después (concurrencia 1 => en orden).
    await this.designQueue.add('finalize', { type: 'finalize', designId });
  }

  /**
   * Vista previa EFÍMERA: renderiza el primer color del área indicada y
   * genera el SEO SOLO para mostrarlo. NO persiste nada (ni diseño, ni
   * render, ni SEO, ni embedding). El diseño solo se crea al "Generar".
   */
  async previewDesign(dto: PreviewDesignDto): Promise<PreviewResult> {
    const product = await this.productsRepository.findOne({
      where: { id: dto.productId },
      relations: {
        printAreas: true,
        colors: true,
        photoSessions: { mockups: true },
      },
    });
    if (!product) {
      throw new BadRequestException('El producto no existe');
    }

    const area = (product.printAreas ?? []).find(
      (a) => a.id === dto.printAreaId,
    );
    if (!area || !area.widthMm || !area.heightMm) {
      throw new BadRequestException(
        'El área de impresión no existe o no tiene tamaño en mm',
      );
    }

    // Placements del área a previsualizar.
    const placements = dto.placements
      .filter((p) => p.printAreaId === area.id)
      .map((p, i) =>
        this.placementsRepository.create({
          printAreaId: p.printAreaId,
          imageUrl: p.imageUrl,
          imagePublicId: p.imagePublicId ?? null,
          xMm: p.xMm,
          yMm: p.yMm,
          widthMm: p.widthMm,
          heightMm: p.heightMm,
          rotation: p.rotation ?? 0,
          zIndex: p.zIndex ?? i,
        }),
      );
    if (placements.length === 0) {
      throw new BadRequestException('El área no tiene imágenes colocadas');
    }

    // Sesión anclada al área con al menos un mockup.
    const session = (product.photoSessions ?? []).find(
      (s) => s.printAreaId === area.id && (s.mockups ?? []).length > 0,
    );
    if (!session) {
      throw new BadRequestException(
        'No hay una sesión con mockups anclada a esta área',
      );
    }
    const mockup = session.mockups[0];

    // Color a renderizar (el primero activo).
    const color = dto.colorId
      ? (product.colors ?? []).find((c) => c.id === dto.colorId)
      : null;

    // Render efímero del primer mockup con el primer color.
    const url = await this.renderOne(
      area,
      placements,
      mockup,
      color ? { hex: color.hex } : null,
    );

    // SEO en memoria (sin guardar ni embedding).
    const seo = await this.buildSeoPreview(product, url);

    return { printAreaId: area.id, imageUrl: url, seo };
  }

  /**
   * Genera el SEO en memoria (textos + JSON-LD + Open Graph) sin persistir
   * nada. Se usa para el preview. Devuelve null si la IA falla.
   */
  private async buildSeoPreview(
    product: Product,
    imageUrl: string | null,
  ): Promise<DesignSeoView | null> {
    let generated: GeneratedSeo;
    try {
      generated = await this.aiService.generateSeo({
        productName: product.name,
        productCategory: product.category,
        productDescription: product.description,
        imageUrl,
      });
    } catch (error) {
      this.logger.warn(
        `No se pudo generar el SEO de preview: ${(error as Error).message}`,
      );
      return null;
    }
    const imageUrls = imageUrl ? [imageUrl] : [];
    return {
      title: generated.title,
      slug: generated.slug,
      metaTitle: generated.metaTitle || null,
      metaDescription: generated.metaDescription || null,
      description: generated.description,
      keywords: generated.keywords,
      jsonLd: this.buildJsonLd(generated, product, imageUrls),
      openGraph: this.buildOpenGraph(generated, imageUrl),
    };
  }

  /**
   * Genera un código numérico único de 6 dígitos (100000–999999).
   * Reintenta ante colisiones contra la BD.
   */
  async generateUniqueCode(): Promise<string> {
    for (let attempt = 0; attempt < 20; attempt++) {
      const code = String(Math.floor(100000 + Math.random() * 900000));
      const exists = await this.designsRepository.exists({ where: { code } });
      if (!exists) return code;
    }
    throw new Error('No se pudo generar un código único para el diseño');
  }

  /**
   * Backfill: asigna un código de 6 dígitos a los diseños que aún no lo
   * tienen. Se ejecuta al iniciar el módulo.
   */
  async backfillCodes(): Promise<void> {
    const pending = await this.designsRepository.find({
      where: { code: IsNull() },
      select: { id: true },
    });
    for (const d of pending) {
      const code = await this.generateUniqueCode();
      await this.designsRepository.update(d.id, { code });
    }
    if (pending.length > 0) {
      this.logger.log(`Backfill de códigos: ${pending.length} diseño(s)`);
    }
  }

  async onModuleInit(): Promise<void> {
    try {
      await this.backfillCodes();
    } catch (err) {
      this.logger.error('Error en backfill de códigos de diseño', err as Error);
    }
  }

  findAll(): Promise<Design[]> {
    return this.designsRepository.find({
      relations: { product: true, seo: true },
      order: { createdAt: 'DESC' },
    });
  }

  /** Estado ligero para polling (sin cargar todo el producto). */
  async getStatus(id: string): Promise<{
    id: string;
    status: Design['status'];
    errorMessage: string | null;
    total: number;
    done: number;
    failed: number;
  }> {
    const design = await this.designsRepository.findOne({
      where: { id },
      relations: { renders: true },
    });
    if (!design) throw new NotFoundException('Diseño no encontrado');
    const renders = design.renders ?? [];
    return {
      id: design.id,
      status: design.status,
      errorMessage: design.errorMessage,
      total: renders.length,
      done: renders.filter((r) => r.status === 'done').length,
      failed: renders.filter((r) => r.status === 'failed').length,
    };
  }

  async findOne(id: string): Promise<Design> {
    const design = await this.designsRepository.findOne({
      where: { id },
      relations: {
        product: {
          printAreas: true,
          colors: true,
          photoSessions: { mockups: true },
        },
        placements: true,
        renders: true,
        seo: true,
      },
    });
    if (!design) {
      throw new NotFoundException('Diseño no encontrado');
    }
    design.placements = (design.placements ?? []).sort(
      (a, b) => a.zIndex - b.zIndex,
    );
    design.renders = (design.renders ?? []).sort(
      (a, b) => a.position - b.position,
    );
    if (design.product?.printAreas) {
      design.product.printAreas = design.product.printAreas.sort(
        (a, b) => a.position - b.position,
      );
    }
    if (design.product?.colors) {
      design.product.colors = design.product.colors.sort(
        (a, b) => a.position - b.position,
      );
    }
    // Ordena los mockups de cada sesión por posición.
    for (const session of design.product?.photoSessions ?? []) {
      session.mockups = (session.mockups ?? []).sort(
        (a, b) => a.position - b.position,
      );
    }
    return design;
  }

  async update(id: string, dto: UpdateDesignDto): Promise<Design> {
    const design = await this.findOne(id);
    if (dto.name !== undefined) design.name = dto.name;
    await this.designsRepository.save(design);
    return this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    const design = await this.findOne(id);
    await this.designsRepository.remove(design);
  }

  /** Sube una imagen de diseño a Cloudinary y devuelve sus datos. */
  uploadImage(dto: UploadImageDto): Promise<UploadedImage> {
    return this.cloudinaryService.uploadImageData(dto.dataUri, {
      folder: 'kult/designs',
    });
  }

  /**
   * Reemplaza por completo las colocaciones del diseño. Valida que cada
   * printAreaId pertenezca al producto del diseño.
   */
  async setPlacements(id: string, dto: SetPlacementsDto): Promise<Design> {
    const design = await this.findOne(id);

    if (dto.placements.length > 0) {
      const areaIds = [...new Set(dto.placements.map((p) => p.printAreaId))];
      const areas = await this.printAreasRepository.find({
        where: { id: In(areaIds), productId: design.productId },
      });
      const valid = new Set(areas.map((a) => a.id));
      const invalid = areaIds.filter((aid) => !valid.has(aid));
      if (invalid.length > 0) {
        throw new BadRequestException(
          'Una o más áreas de impresión no pertenecen al producto del diseño',
        );
      }
    }

    await this.placementsRepository.delete({ designId: id });

    if (dto.placements.length > 0) {
      const rows = dto.placements.map((p, index) =>
        this.placementsRepository.create({
          designId: id,
          printAreaId: p.printAreaId,
          imageUrl: p.imageUrl,
          imagePublicId: p.imagePublicId ?? null,
          xMm: p.xMm,
          yMm: p.yMm,
          widthMm: p.widthMm,
          heightMm: p.heightMm,
          rotation: p.rotation ?? 0,
          zIndex: p.zIndex ?? index,
        }),
      );
      await this.placementsRepository.save(rows);
    }

    return this.findOne(id);
  }

  /**
   * Ejecuta UN render (llamado por el worker). Carga el DesignRender, resuelve
   * el mockup y smart objects, mapea las placements (mm -> px), renderiza en
   * SudoMock, sube a Cloudinary y marca el render como done/failed.
   */
  async executeRenderJob(renderId: string): Promise<void> {
    const render = await this.rendersRepository.findOne({
      where: { id: renderId },
    });
    if (!render) return;

    render.status = 'processing';
    await this.rendersRepository.save(render);

    try {
      const design = await this.findOne(render.designId);
      const area = (design.product?.printAreas ?? []).find(
        (a) => a.id === render.printAreaId,
      );
      if (!area || !area.widthMm || !area.heightMm) {
        throw new Error('El área de impresión no tiene tamaño en mm');
      }
      const placements = (design.placements ?? []).filter(
        (p) => p.printAreaId === area.id,
      );
      if (placements.length === 0) {
        throw new Error('El área no tiene imágenes colocadas');
      }

      // Localiza el SessionMockup usado por este render.
      const mockup = this.findSessionMockup(design, render.sessionMockupId);
      if (!mockup) {
        throw new Error('No se encontró el mockup de la sesión');
      }

      const color =
        render.colorId && render.colorHex
          ? { hex: render.colorHex }
          : null;

      const url = await this.renderOne(area, placements, mockup, color);

      render.imageUrl = url;
      render.status = 'done';
      render.errorMessage = null;
      await this.rendersRepository.save(render);
    } catch (error) {
      render.status = 'failed';
      render.errorMessage = (error as Error).message;
      await this.rendersRepository.save(render);
      this.logger.warn(
        `Render ${renderId} falló: ${(error as Error).message}`,
      );
    }
  }

  /**
   * Finaliza un diseño: genera el SEO con el primer render exitoso y pone el
   * estado en ready/failed según el resultado de los renders.
   */
  async finalizeDesign(designId: string): Promise<void> {
    const design = await this.findOne(designId);
    const renders = design.renders ?? [];
    const done = renders.filter((r) => r.status === 'done');
    const failed = renders.filter((r) => r.status === 'failed');

    // Genera SEO con las imágenes de los renders logrados.
    if (done.length > 0) {
      await this.generateAndSaveSeo(
        design,
        done.map((r) => r.imageUrl!).filter(Boolean),
      );
    }

    // Estado final.
    let status: Design['status'];
    let errorMessage: string | null = null;
    if (done.length > 0) {
      status = 'ready';
      if (failed.length > 0) {
        errorMessage = `${failed.length} de ${renders.length} renders fallaron`;
      }
    } else {
      status = 'failed';
      errorMessage = 'No se pudo generar ningún render';
    }
    await this.designsRepository.update(designId, { status, errorMessage });
  }

  /**
   * Regenera los renders de un diseño: borra los anteriores, replanifica
   * según sus placements/colores actuales y vuelve a encolar. Sirve para
   * reintentar tras fallos o rehacer el diseño.
   */
  async regenerate(id: string): Promise<Design> {
    const design = await this.findOne(id);
    if ((design.placements ?? []).length === 0) {
      throw new BadRequestException('El diseño no tiene imágenes colocadas');
    }

    // Reconstruye el plan de renders a partir del producto y placements.
    const product = design.product!;
    const areaById = new Map((product.printAreas ?? []).map((a) => [a.id, a]));
    // Mantiene los colores que ya tenían renders (preserva selección previa).
    const prevColorIds = [
      ...new Set(
        (design.renders ?? [])
          .map((r) => r.colorId)
          .filter((c): c is string => !!c),
      ),
    ];
    const colorById = new Map((product.colors ?? []).map((c) => [c.id, c]));
    const colorTargets =
      prevColorIds.length > 0
        ? prevColorIds.map((cid) => colorById.get(cid)).filter((c) => !!c)
        : [null];

    const areasWithImages = [
      ...new Set((design.placements ?? []).map((p) => p.printAreaId)),
    ];
    const planned: Partial<DesignRender>[] = [];
    let pos = 0;
    for (const areaId of areasWithImages) {
      const area = areaById.get(areaId);
      if (!area) continue;
      const session = (product.photoSessions ?? []).find(
        (s) => s.printAreaId === areaId && (s.mockups ?? []).length > 0,
      );
      if (!session) continue;
      for (const mockup of session.mockups) {
        for (const color of colorTargets) {
          planned.push({
            designId: id,
            printAreaId: area.id,
            printAreaName: area.name,
            sessionId: session.id,
            sessionName: session.name,
            sessionMockupId: mockup.id,
            sudomockUuid: mockup.sudomockUuid,
            colorId: color?.id ?? null,
            colorName: color?.name ?? null,
            colorHex: color?.hex ?? null,
            status: 'pending',
            position: pos++,
          });
        }
      }
    }
    if (planned.length === 0) {
      throw new BadRequestException(
        'No hay sesiones con mockups ancladas a las áreas con imágenes',
      );
    }

    await this.rendersRepository.delete({ designId: id });
    await this.rendersRepository.save(
      planned.map((r) => this.rendersRepository.create(r)),
    );
    await this.designsRepository.update(id, {
      status: 'generating',
      errorMessage: null,
    });
    await this.enqueueRenders(id);
    return this.findOne(id);
  }

  /**
   * Renderiza una combinación concreta (área, placements, mockup, color) en
   * SudoMock y sube el resultado a Cloudinary. Devuelve la URL de Cloudinary.
   */
  private async renderOne(
    area: PrintArea,
    placements: DesignPlacement[],
    mockup: SessionMockup,
    color: { hex: string } | null,
  ): Promise<string> {
    const smartObjects = (mockup.smartObjects ?? []) as SmartObject[];
    // Todas las capas de diseño "dise". Si no hay ninguna por nombre, se usa
    // la primera capa del mockup como fallback.
    const designSos = this.findSmartObjects(smartObjects, 'dise');
    const designLayers =
      designSos.length > 0
        ? designSos
        : smartObjects[0]
          ? [smartObjects[0]]
          : [];
    const colorSo = this.findSmartObject(smartObjects, 'color');
    if (designLayers.length === 0) {
      throw new Error('El mockup no tiene una capa de diseño');
    }

    // La misma imagen cargada se aplica a TODAS las capas "dise". Cada capa
    // escala las placements (mm -> px) según su propio tamaño.
    const designInputs = designLayers.flatMap((designSo) => {
      const pxPerMmX = designSo.size.width / area.widthMm!;
      const pxPerMmY = designSo.size.height / area.heightMm!;
      return placements.map((p) => ({
        uuid: designSo.uuid,
        asset: {
          url: p.imageUrl,
          fit: 'contain' as const,
          size: {
            width: Math.max(1, Math.round(p.widthMm * pxPerMmX)),
            height: Math.max(1, Math.round(p.heightMm * pxPerMmY)),
          },
          position: {
            left: Math.round(p.xMm * pxPerMmX),
            top: Math.round(p.yMm * pxPerMmY),
          },
          rotate: p.rotation || undefined,
        },
      }));
    });
    const colorInputs =
      colorSo && color ? [{ uuid: colorSo.uuid, color: { hex: color.hex } }] : [];

    const accountId = this.resolveAccountId(mockup);
    const result = await this.sudomockService.renderPsdMockup(accountId, {
      mockupId: mockup.sudomockUuid,
      smartObjects: [...colorInputs, ...designInputs],
      exportOptions: { imageFormat: 'webp', imageSize: 1024 },
    });
    const uploaded = await this.cloudinaryService.uploadFromUrl(result.url, {
      folder: 'kult/renders',
    });
    return uploaded.url;
  }

  /** Busca el SessionMockup por id dentro de las sesiones del producto. */
  private findSessionMockup(
    design: Design,
    sessionMockupId: string,
  ): SessionMockup | undefined {
    for (const session of design.product?.photoSessions ?? []) {
      const found = (session.mockups ?? []).find(
        (m) => m.id === sessionMockupId,
      );
      if (found) return found;
    }
    return undefined;
  }

  /**
   * Regenera solo el SEO (texto, metadatos, embedding) del diseño, sin
   * volver a renderizar. Usa `hints` como referencias y, si se pasa,
   * `imageUrl` del último render como imagen de contexto.
   */
  async regenerateSeo(
    id: string,
    dto: RegenerateSeoDto,
  ): Promise<DesignSeoView | null> {
    const design = await this.findOne(id);
    const seo = await this.generateAndSaveSeo(
      design,
      dto.imageUrl ? [dto.imageUrl] : [],
      dto.hints ?? null,
    );
    if (!seo) {
      throw new BadRequestException(
        'No se pudo generar el SEO. Revisa la configuración de IA.',
      );
    }
    return seo;
  }

  /**
   * Genera el SEO con IA (solo textos), construye en el backend el
   * structured data (JSON-LD) y Open Graph con datos reales del producto,
   * calcula el embedding y persiste todo. Devuelve null si la IA falla.
   */
  private async generateAndSaveSeo(
    design: Design,
    imageUrls: string[],
    hints?: string | null,
  ): Promise<DesignSeoView | null> {
    const product = design.product;
    if (!product) return null;

    const imageUrl = imageUrls[0] ?? null;

    let generated: GeneratedSeo;
    try {
      generated = await this.aiService.generateSeo({
        productName: product.name,
        productCategory: product.category,
        productDescription: product.description,
        imageUrl,
        hints,
      });
    } catch (error) {
      // No bloquea el preview si la IA falla, pero deja rastro en el log.
      this.logger.warn(
        `No se pudo generar el SEO del diseño ${design.id}: ${
          (error as Error).message
        }`,
      );
      return null;
    }

    const jsonLd = this.buildJsonLd(generated, product, imageUrls);
    const openGraph = this.buildOpenGraph(generated, imageUrl);

    // Upsert del registro SEO (uno por diseño).
    let seo = await this.seoRepository.findOne({
      where: { designId: design.id },
    });
    if (!seo) {
      seo = this.seoRepository.create({ designId: design.id });
    }
    seo.title = generated.title;
    seo.slug = generated.slug;
    seo.metaTitle = generated.metaTitle || null;
    seo.metaDescription = generated.metaDescription || null;
    seo.description = generated.description;
    seo.keywords = generated.keywords;
    seo.jsonLd = jsonLd;
    seo.openGraph = openGraph;
    await this.seoRepository.save(seo);

    // El nombre del diseño se toma del título generado.
    if (generated.title && design.name !== generated.title) {
      await this.designsRepository.update(design.id, {
        name: generated.title,
      });
    }

    // Embedding de la descripción. Se guarda en design_embeddings, una tabla
    // que TypeORM NO conoce (sin entidad), para que `synchronize` no la toque.
    try {
      const embedding = await this.aiService.embed(generated.description);
      const literal = `[${embedding.join(',')}]`;
      await this.dataSource.query(
        `INSERT INTO design_embeddings (design_id, embedding, updated_at)
         VALUES ($1, $2::vector, now())
         ON CONFLICT (design_id)
         DO UPDATE SET embedding = EXCLUDED.embedding, updated_at = now()`,
        [design.id, literal],
      );
    } catch {
      // Si el embedding falla, dejamos el SEO sin vector (búsqueda degradada).
    }

    return {
      title: generated.title,
      slug: generated.slug,
      metaTitle: generated.metaTitle || null,
      metaDescription: generated.metaDescription || null,
      description: generated.description,
      keywords: generated.keywords,
      jsonLd,
      openGraph,
    };
  }

  /**
   * Construye el JSON-LD schema.org/Product con datos reales del producto.
   * La marca sale del .env (BRAND_NAME), no del producto.
   */
  private buildJsonLd(
    seo: GeneratedSeo,
    product: Product,
    imageUrls: string[],
  ): Record<string, unknown> {
    const brandName = this.configService.get<string>('BRAND_NAME') ?? 'Kult';
    const siteUrl = this.configService.get<string>('SITE_URL') ?? '';
    const url = siteUrl ? `${siteUrl}/productos/${seo.slug}` : undefined;

    const jsonLd: Record<string, unknown> = {
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: seo.title,
      description: seo.description,
      brand: { '@type': 'Brand', name: brandName },
      category: product.category ?? product.name,
      inLanguage: 'es',
    };

    if (imageUrls.length > 0) jsonLd.image = imageUrls;
    if (seo.keywords.length) jsonLd.keywords = seo.keywords.join(', ');
    if (product.composition) jsonLd.material = product.composition;

    // Colores y tallas del producto.
    const colors = (product.colors ?? []).map((c) => c.name);
    if (colors.length) jsonLd.color = colors.join(', ');
    const sizes = (product.sizes ?? []).map((s) => s.name);
    if (sizes.length) {
      jsonLd.additionalProperty = [
        {
          '@type': 'PropertyValue',
          name: 'Tallas',
          value: sizes.join(', '),
        },
      ];
    }

    // Oferta: Google requiere offers/review/aggregateRating para rich results.
    if (product.basePriceCents != null) {
      jsonLd.offers = {
        '@type': 'Offer',
        price: (product.basePriceCents / 100).toFixed(2),
        priceCurrency: product.currency ?? 'USD',
        availability: 'https://schema.org/InStock',
        ...(url ? { url } : {}),
      };
    }
    if (url) jsonLd.url = url;

    return jsonLd;
  }

  /** Construye los metadatos Open Graph / Twitter Card. */
  private buildOpenGraph(
    seo: GeneratedSeo,
    imageUrl: string | null,
  ): Record<string, unknown> {
    const siteUrl = this.configService.get<string>('SITE_URL') ?? '';
    const brandName = this.configService.get<string>('BRAND_NAME') ?? 'Kult';
    const url = siteUrl ? `${siteUrl}/productos/${seo.slug}` : undefined;
    const title = seo.metaTitle || seo.title;
    const description = seo.metaDescription || seo.description;

    return {
      'og:type': 'product',
      'og:site_name': brandName,
      'og:title': title,
      'og:description': description,
      ...(imageUrl ? { 'og:image': imageUrl } : {}),
      ...(url ? { 'og:url': url } : {}),
      'og:locale': 'es_ES',
      'twitter:card': 'summary_large_image',
      'twitter:title': title,
      'twitter:description': description,
      ...(imageUrl ? { 'twitter:image': imageUrl } : {}),
    };
  }

  /**
   * Búsqueda semántica de diseños: embebe la consulta y ordena por
   * distancia coseno contra los embeddings (pgvector).
   */
  async search(query: string, limit = 20): Promise<Design[]> {
    const q = query.trim();
    if (!q) return [];

    let embedding: number[];
    try {
      embedding = await this.aiService.embed(q);
    } catch {
      return [];
    }
    const literal = `[${embedding.join(',')}]`;

    // Devuelve los ids ordenados por similitud (menor distancia primero).
    const rows: { design_id: string }[] = await this.dataSource.query(
      `SELECT design_id
         FROM design_embeddings
        WHERE embedding IS NOT NULL
        ORDER BY embedding <=> $1::vector
        LIMIT $2`,
      [literal, limit],
    );
    const ids = rows.map((r) => r.design_id);
    if (ids.length === 0) return [];

    // Carga los diseños y preserva el orden de similitud.
    const designs = await this.designsRepository.find({
      where: { id: In(ids) },
      relations: { product: true, seo: true },
    });
    const byId = new Map(designs.map((d) => [d.id, d]));
    return ids.map((id) => byId.get(id)).filter((d): d is Design => !!d);
  }

  /** Busca un smart object cuyo nombre empiece por el prefijo (case-insensitive). */
  private findSmartObject(
    smartObjects: SmartObject[],
    prefix: string,
  ): SmartObject | undefined {
    const p = prefix.toLowerCase();
    return smartObjects.find((so) =>
      (so.name ?? '').toLowerCase().startsWith(p),
    );
  }

  /** Todos los smart objects cuyo nombre empiece por el prefijo. */
  private findSmartObjects(
    smartObjects: SmartObject[],
    prefix: string,
  ): SmartObject[] {
    const p = prefix.toLowerCase();
    return smartObjects.filter((so) =>
      (so.name ?? '').toLowerCase().startsWith(p),
    );
  }

  /** Cuenta de SudoMock de origen del mockup (fallback 'default'). */
  private resolveAccountId(mockup: SessionMockup): string {
    return mockup.sudomockAccountId ?? 'default';
  }
}

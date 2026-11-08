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
import { ZipArchive } from 'archiver';
import { AiService, type GeneratedSeo } from '../ai/ai.service';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { FontsService } from '../fonts/fonts.service';
import { SudomockService } from '../sudomock/sudomock.service';
import { PhotoSession } from '../products/entities/photo-session.entity';
import { Product } from '../products/entities/product.entity';
import { SessionMockup } from '../products/entities/session-mockup.entity';
import { DESIGN_QUEUE, type DesignJob } from './designs.queue';
import { GenerateDesignDto } from './dto/generate-design.dto';
import { PreviewDesignDto } from './dto/preview-design.dto';
import { RegenerateSeoDto } from './dto/regenerate-seo.dto';
import { RenderSvgDto, RenderSvgFieldDto } from './dto/render-svg.dto';
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

/** Fuente de diseño: un área de impresión y el mockup que define sus objetos. */
interface DesignSource {
  printAreaId: string | null;
  printAreaName: string | null;
  session: PhotoSession;
  mockup: SessionMockup;
}

/** Resultado de una vista previa efímera (un render + SEO, sin persistir). */
export interface PreviewResult {
  printAreaId: string;
  /** URL del render del primer color (en Cloudinary, carpeta kult/renders). */
  imageUrl: string;
  seo: DesignSeoView | null;
}

/** Resumen de diseño para la grilla de listado. */
export interface DesignSummary {
  id: string;
  name: string;
  status: Design['status'];
  /** Producto base del diseño (para filtrar por producto). */
  productId: string;
  productName: string | null;
  /** Primera imagen de render lograda (portada), o null. */
  coverImageUrl: string | null;
  /** true si algún placement tiene SVG fuente (diseño editable). */
  editable: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/** Resultado de rasterizar una plantilla SVG (imagen + fuente SVG). */
export interface RenderSvgResult {
  /** PNG generado, subido a Cloudinary (mismo shape que uploadImage). */
  image: UploadedImage;
  /** URL del SVG fuente (raw) persistido para re-edición. */
  svgUrl: string;
  svgPublicId: string;
  /** Familias tipográficas del SVG que NO están registradas. */
  missingFonts: string[];
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
    private readonly cloudinaryService: CloudinaryService,
    private readonly sudomockService: SudomockService,
    private readonly configService: ConfigService,
    private readonly fontsService: FontsService,
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

    // Cada área de impresión tiene una fuente (sesión + mockup) cuyos smart
    // objects "dise" son sus objetos inteligentes. Cada placement referencia
    // uno por uuid (en el campo printAreaId).
    const sources = this.resolveSources(product);
    if (sources.length === 0) {
      throw new BadRequestException(
        'El producto no tiene sesiones con mockups para renderizar',
      );
    }
    const usedSources = new Set<DesignSource>();
    for (const p of dto.placements) {
      const source = this.findSourceBySmartObject(sources, p.printAreaId);
      if (!source) {
        throw new BadRequestException(
          'Una o más imágenes no corresponden a un área de diseño del mockup',
        );
      }
      usedSources.add(source);
    }

    // Área principal: obligatoria si el producto tiene áreas ancladas, y debe
    // tener imágenes (su render es la portada del diseño).
    const anchored = sources.filter((s) => s.printAreaId);
    let mainPrintAreaId: string | null = null;
    if (anchored.length > 0) {
      const main = anchored.find((s) => s.printAreaId === dto.mainPrintAreaId);
      if (!main) {
        throw new BadRequestException(
          'Selecciona el área de impresión principal del diseño',
        );
      }
      if (!usedSources.has(main)) {
        throw new BadRequestException(
          'El área principal debe tener al menos una imagen colocada',
        );
      }
      mainPrintAreaId = main.printAreaId;
      // El área principal se renderiza primero (portada y SEO).
      sources.sort(
        (a, b) =>
          Number(b.printAreaId === mainPrintAreaId) -
          Number(a.printAreaId === mainPrintAreaId),
      );
    }

    // Colores a renderizar (en orden). Vacío => un render sin color.
    const colorById = new Map((product.colors ?? []).map((c) => [c.id, c]));
    const colorTargets =
      dto.colorIds && dto.colorIds.length > 0
        ? dto.colorIds.map((id) => colorById.get(id)).filter((c) => !!c)
        : [null];

    // Por cada área de impresión con imágenes: un render por mockup de su
    // sesión fuente × color. Cada render aplica solo las placements de esa
    // área (cada una va a su smart object por uuid).
    const plannedRenders: Partial<DesignRender>[] = [];
    let pos = 0;
    for (const source of sources) {
      if (!usedSources.has(source)) continue;
      const { session } = source;
      const areaName = this.sourceAreaName(source);
      for (const mockup of session.mockups) {
        for (const color of colorTargets) {
          plannedRenders.push({
            // printAreaId guarda el id de la sesión fuente (referencia estable
            // para re-render; el mapeo real es por smart object en la placement).
            printAreaId: session.id,
            printAreaName: areaName,
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
        'No hay mockups para renderizar las áreas con imágenes',
      );
    }

    // Crea el diseño con placements y renders pendientes en una transacción.
    const design = this.designsRepository.create({
      name: 'Generando…',
      productId: dto.productId,
      mainPrintAreaId,
      hasCopyright: dto.hasCopyright,
      code: await this.generateUniqueCode(),
      status: 'generating',
      placements: dto.placements.map((p, i) =>
        this.placementsRepository.create({
          printAreaId: p.printAreaId,
          imageUrl: p.imageUrl,
          imagePublicId: p.imagePublicId ?? null,
          svgUrl: p.svgUrl ?? null,
          fieldValues: p.fieldValues ?? null,
          xMm: p.xMm,
          yMm: p.yMm,
          widthMm: p.widthMm,
          heightMm: p.heightMm,
          rotation: p.rotation ?? 0,
          authorAreaWidthPx: p.authorAreaWidthPx ?? null,
          authorAreaHeightPx: p.authorAreaHeightPx ?? null,
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

    // dto.printAreaId es el uuid de un smart object; su fuente determina el
    // área de impresión (y el mockup) a previsualizar.
    const source = this.findSourceBySmartObject(
      this.resolveSources(product),
      dto.printAreaId,
    );
    if (!source) {
      throw new BadRequestException(
        'El área (smart object) no existe en el mockup',
      );
    }
    const designNames = this.designSmartObjectNames(source.mockup);

    // Placements del área de impresión (todos sus objetos inteligentes).
    const placements = dto.placements
      .filter((p) => designNames.has(p.printAreaId))
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
          authorAreaWidthPx: p.authorAreaWidthPx ?? null,
          authorAreaHeightPx: p.authorAreaHeightPx ?? null,
          zIndex: p.zIndex ?? i,
        }),
      );
    if (placements.length === 0) {
      throw new BadRequestException('El área no tiene imágenes colocadas');
    }

    // Color a renderizar (el primero activo).
    const color = dto.colorId
      ? (product.colors ?? []).find((c) => c.id === dto.colorId)
      : null;

    // Render efímero del primer mockup con el primer color.
    const url = await this.renderOne(
      placements,
      source.mockup,
      color ? { hex: color.hex } : null,
    );

    // SEO en memoria (sin guardar ni embedding).
    const seo = await this.buildSeoPreview(product, url);

    return { printAreaId: dto.printAreaId, imageUrl: url, seo };
  }

  /**
   * "Crea tu propia camiseta" (público): renderiza la imagen del usuario en
   * TODOS los mockups de la sesión indicada del producto, con el color
   * elegido. Efímero (no persiste nada). Devuelve las URLs resultantes en el
   * orden de los mockups de la sesión.
   */
  async renderCustomSession(params: {
    productId: string;
    sessionId: string;
    imageUrl: string;
    designSmartObjectUuid: string;
    placement: {
      xPx: number;
      yPx: number;
      widthPx: number;
      heightPx: number;
      rotation?: number;
    };
    colorId?: string;
    /**
     * Hex del color a tintar, p.ej. "#000000". Si viene, se usa directamente
     * (más robusto que resolver por id). Prevalece sobre `colorId`.
     */
    colorHex?: string;
    /**
     * Máximo de mockups a renderizar. Para el preview público gratuito se
     * pasa 1 (solo la primera imagen); con sesión de cliente se omite para
     * renderizar todos. También devuelve cuántos mockups tiene la sesión.
     */
    maxMockups?: number;
  }): Promise<{ images: string[]; totalMockups: number }> {
    const product = await this.productsRepository.findOne({
      where: { id: params.productId },
      relations: { colors: true, photoSessions: { mockups: true } },
    });
    if (!product) {
      throw new BadRequestException('El producto no existe');
    }

    const session = (product.photoSessions ?? []).find(
      (s) => s.id === params.sessionId,
    );
    if (!session || (session.mockups ?? []).length === 0) {
      throw new BadRequestException('La sesión no existe o no tiene mockups');
    }

    // Color a tintar: preferimos el hex explícito (robusto). Si no viene, se
    // intenta resolver por id contra los colores del producto.
    const normalizeHex = (h: string) => (h.startsWith('#') ? h : `#${h}`);
    const colorHex = params.colorHex
      ? normalizeHex(params.colorHex)
      : (params.colorId
          ? (product.colors ?? []).find((c) => c.id === params.colorId)?.hex ??
            null
          : null);
    const color = colorHex ? { hex: colorHex } : null;

    const allMockups = [...session.mockups].sort(
      (a, b) => a.position - b.position,
    );
    const totalMockups = allMockups.length;
    const mockups =
      params.maxMockups != null
        ? allMockups.slice(0, params.maxMockups)
        : allMockups;

    // Cada mockup tiene su PROPIO smart object "dise" (uuid distinto aunque
    // sea la misma capa); lo resolvemos por nombre. La geometría (px del
    // área) es la misma porque el arte comparte dimensiones.
    const renderMockup = async (
      mockup: SessionMockup,
    ): Promise<string | null> => {
      const smartObjects = (mockup.smartObjects ?? []) as SmartObject[];
      const dise = smartObjects.find((so) =>
        (so.name ?? '').toLowerCase().startsWith('dise'),
      );
      if (!dise) {
        this.logger.warn(
          `Mockup ${mockup.id} sin smart object "dise"; se omite.`,
        );
        return null;
      }
      const placement = this.placementsRepository.create({
        printAreaId: dise.uuid,
        imageUrl: params.imageUrl,
        imagePublicId: null,
        xMm: params.placement.xPx,
        yMm: params.placement.yPx,
        widthMm: params.placement.widthPx,
        heightMm: params.placement.heightPx,
        rotation: params.placement.rotation ?? 0,
        zIndex: 0,
      });
      try {
        return await this.renderOne(
          [placement],
          mockup,
          color ? { hex: color.hex } : null,
        );
      } catch (err) {
        this.logger.warn(
          `Render personalizado falló para mockup ${mockup.id}: ${
            (err as Error).message
          }`,
        );
        return null;
      }
    };

    // Renderiza en paralelo en lotes de 3 (cuenta pro de SudoMock), que es
    // mucho más rápido que secuencial. Conserva el orden de los mockups.
    const results = await this.mapInBatches(mockups, 3, renderMockup);
    const urls = results.filter((u): u is string => u !== null);

    if (urls.length === 0) {
      throw new BadRequestException(
        'No se pudo generar ninguna imagen con la imagen cargada',
      );
    }
    return { images: urls, totalMockups };
  }

  /** Sube una imagen de usuario (data URI) a Cloudinary (uso público). */
  uploadUserImage(dataUri: string): Promise<UploadedImage> {
    return this.cloudinaryService.uploadImageData(dataUri, {
      folder: 'kult/user-uploads',
    });
  }

  /**
   * Aplica `fn` a cada elemento en lotes de `size` (concurrencia limitada),
   * conservando el orden de entrada en el resultado. Se usa para paralelizar
   * renders respetando el máximo simultáneo de SudoMock.
   */
  private async mapInBatches<T, R>(
    items: T[],
    size: number,
    fn: (item: T) => Promise<R>,
  ): Promise<R[]> {
    const results: R[] = [];
    for (let i = 0; i < items.length; i += size) {
      const batch = items.slice(i, i + size);
      const settled = await Promise.all(batch.map(fn));
      results.push(...settled);
    }
    return results;
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

  /**
   * Listado resumido para la grilla de diseños: incluye la portada (primer
   * render logrado) y si el diseño es editable (tiene algún SVG fuente).
   */
  async findAll(): Promise<DesignSummary[]> {
    const designs = await this.designsRepository.find({
      relations: { product: true, renders: true, placements: true },
      order: { createdAt: 'DESC' },
    });

    return designs.map((d) => {
      const renders = [...(d.renders ?? [])].sort(
        (a, b) => a.position - b.position,
      );
      const cover = renders.find((r) => r.status === 'done' && r.imageUrl);
      const editable = (d.placements ?? []).some((p) => !!p.svgUrl);
      return {
        id: d.id,
        name: d.name,
        status: d.status,
        productId: d.productId,
        productName: d.product?.name ?? null,
        coverImageUrl: cover?.imageUrl ?? null,
        editable,
        createdAt: d.createdAt,
        updatedAt: d.updatedAt,
      };
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
    if (dto.hasCopyright !== undefined) design.hasCopyright = dto.hasCopyright;
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
   * Rasteriza una plantilla SVG a PNG: sustituye el contenido de cada
   * `<text id>` por el valor de `fields`, carga las fuentes registradas que
   * usa el SVG y renderiza con resvg. Sube el PNG resultante a Cloudinary y
   * también el SVG fuente (raw) para poder re-generarlo/re-editarlo después.
   * Devuelve la imagen más la URL del SVG fuente y las familias faltantes.
   */
  async renderSvg(dto: RenderSvgDto): Promise<RenderSvgResult> {
    const fields = dto.fields ?? [];

    // Sustituye el texto de cada campo conservando su alineación. Campos por
    // id => <text id="...">; campos "__textN" => el N-ésimo <text>.
    let svg = dto.svg;
    const positional = new Map<number, RenderSvgFieldDto>();
    for (const field of fields) {
      const m = field.key.match(/^__text(\d+)$/);
      if (m) {
        positional.set(Number(m[1]), field);
      } else {
        svg = this.replaceSvgTextById(svg, field.key, field);
      }
    }
    if (positional.size > 0) {
      svg = this.replaceSvgTextByIndex(svg, positional);
    }

    // Familias tipográficas referenciadas por el SVG.
    const families = this.extractFontFamilies(svg);
    const registered = await this.fontsService.findByFamilies(families);
    const registeredFamilies = new Set(registered.map((f) => f.family));
    const missingFonts = families.filter((f) => !registeredFamilies.has(f));

    // Descarga las fuentes registradas a archivos temporales. resvg 2.x
    // carga fuentes por ruta (fontFiles), no por buffer; escribimos temporales
    // y los borramos al terminar.
    const { tmpdir } = await import('node:os');
    const { mkdtemp, writeFile, rm } = await import('node:fs/promises');
    const { join } = await import('node:path');
    const tmpDir = await mkdtemp(join(tmpdir(), 'kult-fonts-'));
    const fontFiles: string[] = [];
    let pngBuffer: Buffer;
    try {
      for (const font of registered) {
        try {
          const res = await fetch(font.fileUrl);
          if (!res.ok) continue;
          const buf = Buffer.from(await res.arrayBuffer());
          const ext = font.format ?? 'ttf';
          const filePath = join(tmpDir, `${font.family}.${ext}`);
          await writeFile(filePath, buf);
          fontFiles.push(filePath);
        } catch {
          // Si una fuente no se puede descargar, se omite (quedará en
          // missing a efectos visuales, pero no rompemos el render).
        }
      }

      // Rasteriza a alta resolución: el SVG es vectorial, así que fijar un
      // ancho objetivo grande elimina el pixelado (el alto sale por
      // proporción). Default 2000px.
      const { Resvg } = await import('@resvg/resvg-js');
      const resvg = new Resvg(svg, {
        fitTo: { mode: 'width', value: dto.targetWidth ?? 2000 },
        font: {
          loadSystemFonts: false,
          fontFiles,
        },
      });
      pngBuffer = resvg.render().asPng();
    } finally {
      await rm(tmpDir, { recursive: true, force: true }).catch(() => undefined);
    }
    const dataUri = `data:image/png;base64,${pngBuffer.toString('base64')}`;

    // Sube el PNG (imagen del diseño) y el SVG fuente (raw).
    const image = await this.cloudinaryService.uploadImageData(dataUri, {
      folder: 'kult/designs',
    });
    const svgDataUri = `data:image/svg+xml;base64,${Buffer.from(svg).toString(
      'base64',
    )}`;
    const svgAsset = await this.cloudinaryService.uploadRaw(svgDataUri, {
      folder: 'kult/designs/svg',
    });

    return {
      image,
      svgUrl: svgAsset.url,
      svgPublicId: svgAsset.publicId,
      missingFonts,
    };
  }

  /**
   * Arma un ZIP descargable con los archivos del diseño:
   *  - la imagen (placement) de cada área, nombrada con su smart object;
   *  - el SVG fuente de cada área que lo tenga;
   *  - las fuentes usadas por esos SVG (carpeta fonts/).
   * El archivo se nombra con el código del diseño. Devuelve el buffer ZIP.
   */
  async buildDesignZip(
    id: string,
  ): Promise<{ filename: string; buffer: Buffer }> {
    const design = await this.findOne(id);
    const placements = design.placements ?? [];
    if (placements.length === 0) {
      throw new BadRequestException('El diseño no tiene imágenes');
    }

    // Mapa uuid de smart object -> nombre, desde los mockups del producto.
    const soNameByUuid = new Map<string, string>();
    for (const session of design.product?.photoSessions ?? []) {
      for (const mockup of session.mockups ?? []) {
        for (const so of (mockup.smartObjects ?? []) as SmartObject[]) {
          if (so.uuid && so.name) soNameByUuid.set(so.uuid, so.name);
        }
      }
    }

    const archive = new ZipArchive({ zlib: { level: 9 } });
    const chunks: Buffer[] = [];
    archive.on('data', (c: Buffer) => chunks.push(c));
    const done = new Promise<void>((resolve, reject) => {
      archive.on('end', () => resolve());
      archive.on('error', (e: Error) => reject(e));
    });

    // Evita colisiones de nombre si dos áreas comparten el mismo smart object.
    const used = new Set<string>();
    const uniqueName = (base: string): string => {
      let name = base;
      let i = 2;
      while (used.has(name)) name = `${base}-${i++}`;
      used.add(name);
      return name;
    };

    const fontFamilies = new Set<string>();

    for (const [index, p] of placements.entries()) {
      const rawName =
        soNameByUuid.get(p.printAreaId) ?? `area-${index + 1}`;
      const safe = this.sanitizeFilename(rawName);

      // Imagen (PNG/alta resolución o imagen cargada).
      const imgBuf = await this.fetchBuffer(p.imageUrl);
      if (imgBuf) {
        archive.append(imgBuf, { name: `${uniqueName(safe)}.png` });
      }

      // SVG fuente (si el diseño del área vino de un SVG).
      if (p.svgUrl) {
        const svgBuf = await this.fetchBuffer(p.svgUrl);
        if (svgBuf) {
          archive.append(svgBuf, { name: `${safe}.svg` });
          // Acumula familias para incluir sus fuentes.
          for (const fam of this.extractFontFamilies(svgBuf.toString('utf8'))) {
            fontFamilies.add(fam);
          }
        }
      }
    }

    // Fuentes usadas por los SVG (las que estén registradas).
    if (fontFamilies.size > 0) {
      const fonts = await this.fontsService.findByFamilies([...fontFamilies]);
      for (const font of fonts) {
        const buf = await this.fetchBuffer(font.fileUrl);
        if (buf) {
          const ext = font.format ?? 'ttf';
          archive.append(buf, {
            name: `fonts/${this.sanitizeFilename(font.family)}.${ext}`,
          });
        }
      }
    }

    await archive.finalize();
    await done;

    const code = design.code ?? design.id.slice(0, 8);
    return { filename: `${code}.zip`, buffer: Buffer.concat(chunks) };
  }

  /** Descarga un asset (URL) a buffer. Devuelve null si falla. */
  private async fetchBuffer(url: string): Promise<Buffer | null> {
    try {
      const res = await fetch(url);
      if (!res.ok) return null;
      return Buffer.from(await res.arrayBuffer());
    } catch {
      return null;
    }
  }

  /** Normaliza un texto para usarlo como nombre de archivo. */
  private sanitizeFilename(name: string): string {
    return (
      name
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-zA-Z0-9-_ ]/g, '')
        .trim()
        .replace(/\s+/g, '_') || 'archivo'
    );
  }

  /** Escapa los caracteres especiales de XML de un valor de texto. */
  private escapeXml(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  /**
   * Reconstruye un `<text>` con el texto nuevo alineado según el campo. El
   * anchorX/anchorY vienen en coordenadas absolutas del SVG (ya incluyen el
   * translate original), así que se elimina el `transform` del <text> y se
   * fija `text-anchor` + un único `<tspan x=anchorX y=anchorY>`. Conserva los
   * demás atributos del <text> (class, id) que dan la tipografía.
   */
  private rebuildText(
    openTag: string,
    field: { value: string; anchorX: number; anchorY: number; textAnchor: string },
    close: string,
  ): string {
    // Quita transform y text-anchor previos del tag de apertura.
    let open = openTag
      .replace(/\stransform="[^"]*"/i, '')
      .replace(/\stext-anchor="[^"]*"/i, '');
    // Inserta el nuevo text-anchor antes del cierre '>'.
    open = open.replace(/>$/, ` text-anchor="${field.textAnchor}">`);
    const safe = this.escapeXml(field.value);
    return `${open}<tspan x="${field.anchorX}" y="${field.anchorY}">${safe}</tspan>${close}`;
  }

  /** Reemplaza el `<text id="ID">` por el campo (texto + alineación). */
  private replaceSvgTextById(
    svg: string,
    id: string,
    field: { value: string; anchorX: number; anchorY: number; textAnchor: string },
  ): string {
    const escapedId = id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(
      `(<text\\b[^>]*\\bid="${escapedId}"[^>]*>)([\\s\\S]*?)(</text>)`,
    );
    return svg.replace(re, (_m, open: string, _old: string, close: string) =>
      this.rebuildText(open, field, close),
    );
  }

  /**
   * Reemplaza los `<text>` por su posición (0-based en orden de documento),
   * según el mapa índice->campo. Se usa para los campos sin id, que el
   * cliente identifica por posición (claves "__textN").
   */
  private replaceSvgTextByIndex(
    svg: string,
    byIndex: Map<
      number,
      { value: string; anchorX: number; anchorY: number; textAnchor: string }
    >,
  ): string {
    let index = 0;
    return svg.replace(
      /(<text\b[^>]*>)([\s\S]*?)(<\/text>)/g,
      (full, open: string, _old: string, close: string) => {
        const field = byIndex.get(index++);
        if (!field) return full;
        return this.rebuildText(open, field, close);
      },
    );
  }

  /** Extrae las familias tipográficas (font-family) referenciadas en el SVG. */
  private extractFontFamilies(svg: string): string[] {
    const families = new Set<string>();
    const re = /font-family\s*(?:=|:)\s*["']?([^"';>]+)["']?/gi;
    let match: RegExpExecArray | null;
    while ((match = re.exec(svg)) !== null) {
      // Toma la primera familia de una lista (p.ej. "Poppins, sans-serif").
      const first = match[1].split(',')[0].trim().replace(/^['"]|['"]$/g, '');
      if (first) families.add(first);
    }
    return [...families];
  }

  /**
   * Reemplaza por completo las colocaciones del diseño. Valida que cada
   * printAreaId pertenezca al producto del diseño.
   */
  async setPlacements(id: string, dto: SetPlacementsDto): Promise<Design> {
    const design = await this.findOne(id);

    if (dto.placements.length > 0 && design.product) {
      // Valida contra los smart objects "dise" de los mockups fuente de
      // todas las áreas de impresión.
      const sources = this.resolveSources(design.product);
      const invalid = dto.placements
        .map((p) => p.printAreaId)
        .filter((uuid) => !this.findSourceBySmartObject(sources, uuid));
      if (invalid.length > 0) {
        throw new BadRequestException(
          'Una o más imágenes no corresponden a un área de diseño del mockup',
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
          svgUrl: p.svgUrl ?? null,
          fieldValues: p.fieldValues ?? null,
          xMm: p.xMm,
          yMm: p.yMm,
          widthMm: p.widthMm,
          heightMm: p.heightMm,
          rotation: p.rotation ?? 0,
          authorAreaWidthPx: p.authorAreaWidthPx ?? null,
          authorAreaHeightPx: p.authorAreaHeightPx ?? null,
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

      // Todas las placements del diseño: cada una se mapea a su smart object
      // por uuid dentro de renderOne (no se filtra por área).
      const allPlacements = design.placements ?? [];
      if (allPlacements.length === 0) {
        throw new Error('El diseño no tiene imágenes colocadas');
      }
      // Con varias áreas de impresión, cada render usa solo las placements
      // de SU área: las que apuntan a smart objects del mockup fuente de la
      // sesión del render. Si ninguna coincide (diseños antiguos), usa todas.
      const placements = this.placementsForSession(design, render.sessionId);

      // Localiza el SessionMockup usado por este render.
      const mockup = this.findSessionMockup(design, render.sessionMockupId);
      if (!mockup) {
        throw new Error('No se encontró el mockup de la sesión');
      }

      const color = render.colorHex ? { hex: render.colorHex } : null;

      // Mapa uuid -> tamaño del smart object "diseño" en TODAS las sesiones
      // del producto. Permite escalar la geometría del placement (que está en
      // px del área donde se autoró) al área del mockup destino, aunque sean
      // de distinto tamaño. Evita que el diseño se desubique/encoja.
      const authoringAreaByUuid = this.buildDesignAreaSizeMap(design);

      const url = await this.renderOne(
        placements,
        mockup,
        color,
        authoringAreaByUuid,
      );

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

    // Con concurrencia > 1 el job 'finalize' puede ejecutarse antes de que
    // terminen todos los renders. Si aún hay pendientes o en proceso, se
    // re-encola con un pequeño retraso y se sale (no finaliza todavía).
    const stillRunning = renders.some(
      (r) => r.status === 'pending' || r.status === 'processing',
    );
    if (stillRunning) {
      await this.designQueue.add(
        'finalize',
        { type: 'finalize', designId },
        { delay: 1500 },
      );
      return;
    }

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

    // Sesión fuente: la MISMA en la que se generó el diseño originalmente
    // (guardada en los renders previos). Es clave usarla y no "la primera
    // sesión del producto": las placements guardan su geometría en px del
    // smart object de ESA sesión, así que renderizar en otra sesión de
    // distinto tamaño desubica y encoge el diseño. Solo si el diseño no tiene
    // renders previos (caso raro) se cae al resolvedor por defecto.
    // Con varias áreas de impresión se reutilizan todas las sesiones previas
    // (una por área con imágenes).
    const prevSessionIds = new Set(
      (design.renders ?? []).map((r) => r.sessionId).filter((s) => !!s),
    );
    let regenSources: { session: PhotoSession; areaName: string }[] = (
      product.photoSessions ?? []
    )
      .filter((s) => prevSessionIds.has(s.id) && (s.mockups ?? []).length > 0)
      .map((s) => {
        const src = this.resolveSources(product).find(
          (x) => x.session.id === s.id,
        );
        const firstMockup = [...s.mockups].sort(
          (a, b) => a.position - b.position,
        )[0];
        return {
          session: s,
          areaName: src
            ? this.sourceAreaName(src)
            : [...this.designSmartObjectNames(firstMockup).values()].join(', '),
        };
      });
    if (regenSources.length === 0) {
      const sources = this.resolveSources(product);
      const used = sources.filter((src) =>
        design.placements.some((p) =>
          this.designSmartObjectNames(src.mockup).has(p.printAreaId),
        ),
      );
      const chosen = used.length > 0 ? used : sources.slice(0, 1);
      if (chosen.length === 0) {
        throw new BadRequestException(
          'El producto no tiene sesiones con mockups para renderizar',
        );
      }
      regenSources = chosen.map((src) => ({
        session: src.session,
        areaName: this.sourceAreaName(src),
      }));
    }

    // Mantiene los colores que ya tenían renders (preserva selección previa).
    // Se toman directamente de los renders anteriores (id/nombre/hex), NO
    // resolviéndolos contra product.colors: los colores de un diseño pueden
    // provenir de otro catálogo y no coincidir con los del producto actual.
    type ColorTarget = {
      id: string | null;
      name: string | null;
      hex: string | null;
    };
    const seen = new Set<string>();
    const colorTargets: ColorTarget[] = [];
    for (const r of design.renders ?? []) {
      const key = r.colorId ?? `__nocolor__${r.colorHex ?? r.colorName ?? ''}`;
      if (seen.has(key)) continue;
      seen.add(key);
      colorTargets.push({
        id: r.colorId ?? null,
        name: r.colorName ?? null,
        hex: r.colorHex ?? null,
      });
    }
    // Sin renders previos: un único render sin color.
    if (colorTargets.length === 0) {
      colorTargets.push({ id: null, name: null, hex: null });
    }

    // Un render por mockup de la sesión fuente × color (igual que generate).
    // El área principal del diseño se renderiza primero (portada y SEO).
    if (design.mainPrintAreaId) {
      const isMain = (s: PhotoSession) =>
        Number(s.printAreaId === design.mainPrintAreaId);
      regenSources.sort((a, b) => isMain(b.session) - isMain(a.session));
    }
    const planned: Partial<DesignRender>[] = [];
    let pos = 0;
    for (const { session, areaName } of regenSources) {
      for (const mockup of session.mockups) {
        for (const color of colorTargets) {
          planned.push({
            designId: id,
            printAreaId: session.id,
            printAreaName: areaName,
            sessionId: session.id,
            sessionName: session.name,
            sessionMockupId: mockup.id,
            sudomockUuid: mockup.sudomockUuid,
            colorId: color.id,
            colorName: color.name,
            colorHex: color.hex,
            status: 'pending',
            position: pos++,
          });
        }
      }
    }
    if (planned.length === 0) {
      throw new BadRequestException(
        'No hay mockups para renderizar',
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
  /**
   * Renderiza el mockup aplicando CADA grupo de placements a SU smart object
   * de diseño correspondiente (por uuid). Las coordenadas de las placements
   * están en px del propio smart object (B1), así que no hay conversión
   * mm->px: se usan tal cual. `placements` puede incluir placements de varios
   * smart objects; cada una va a su `printAreaId` (= uuid del smart object).
   */
  private async renderOne(
    placements: DesignPlacement[],
    mockup: SessionMockup,
    color: { hex: string } | null,
    authoringAreaByUuid?: Map<string, { width: number; height: number }>,
  ): Promise<string> {
    const smartObjects = (mockup.smartObjects ?? []) as SmartObject[];
    const soByUuid = new Map(smartObjects.map((so) => [so.uuid, so]));
    const colorSo = this.findSmartObject(smartObjects, 'color');
    // Smart objects "diseño" de ESTE mockup (por nombre), como respaldo si el
    // uuid del placement no existe aquí. Pasa cuando el placement guardó el
    // uuid de otra sesión/mockup: los uuids de "diseño" difieren por mockup
    // aunque la capa sea la misma.
    const designSos = smartObjects.filter((so) =>
      (so.name ?? '').toLowerCase().startsWith('dise'),
    );

    // Cada placement se mapea a su smart object (printAreaId = uuid). Si ese
    // uuid no está en este mockup, se usa el smart object "diseño" del mockup
    // (por posición/orden) como respaldo.
    let diseFallbackIdx = 0;
    const designInputs = placements
      .map((p) => {
        const so =
          soByUuid.get(p.printAreaId) ??
          designSos[diseFallbackIdx++] ??
          designSos[designSos.length - 1] ??
          null;
        if (!so) return null;

        // Escala la geometría del área donde se autoró al área del smart
        // object destino. Tamaño de origen (autoría), en orden de preferencia:
        //   1) el guardado en el placement (authorAreaWidthPx/HeightPx) —lo
        //      envía el editor al generar, es el dato fiable;
        //   2) el tamaño del smart object cuyo uuid = printAreaId (diseños que
        //      autoraron contra un SO concreto);
        //   3) el propio tamaño del SO destino (factor 1, sin escalar).
        const target = so.size;
        const authoring =
          p.authorAreaWidthPx && p.authorAreaHeightPx
            ? { width: p.authorAreaWidthPx, height: p.authorAreaHeightPx }
            : authoringAreaByUuid?.get(p.printAreaId) ??
              (target?.width && target?.height
                ? { width: target.width, height: target.height }
                : undefined);
        const sx =
          authoring && target?.width && authoring.width
            ? target.width / authoring.width
            : 1;
        const sy =
          authoring && target?.height && authoring.height
            ? target.height / authoring.height
            : 1;

        return {
          uuid: so.uuid,
          asset: {
            url: p.imageUrl,
            fit: 'contain' as const,
            size: {
              width: Math.max(1, Math.round(p.widthMm * sx)),
              height: Math.max(1, Math.round(p.heightMm * sy)),
            },
            position: {
              left: Math.round(p.xMm * sx),
              top: Math.round(p.yMm * sy),
            },
            rotate: p.rotation || undefined,
          },
        };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null);

    if (designInputs.length === 0) {
      throw new Error('Ninguna imagen corresponde a un smart object del mockup');
    }

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

  /** Placements del diseño que pertenecen al área de la sesión indicada. */
  private placementsForSession(
    design: Design,
    sessionId: string | null | undefined,
  ): DesignPlacement[] {
    const all = design.placements ?? [];
    const session = sessionId
      ? (design.product?.photoSessions ?? []).find((s) => s.id === sessionId)
      : undefined;
    const sourceMockup = session
      ? [...(session.mockups ?? [])].sort((a, b) => a.position - b.position)[0]
      : undefined;
    if (!sourceMockup) return all;
    const names = this.designSmartObjectNames(sourceMockup);
    const own = all.filter((p) => names.has(p.printAreaId));
    return own.length > 0 ? own : all;
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

  /**
   * Fuentes de diseño del producto: una por área de impresión. Cada una es la
   * primera sesión (por fecha) anclada a esa área que tenga mockups, con su
   * primer mockup (por posición). Dentro de un área, los smart objects "dise"
   * de ese mockup son los objetos inteligentes donde se colocan las imágenes.
   * Si ninguna sesión está anclada a un área (productos antiguos), se usa la
   * primera sesión con mockups como única fuente, sin área.
   */
  private resolveSources(product: Product): DesignSource[] {
    const sessions = [...(product.photoSessions ?? [])]
      .filter((s) => (s.mockups ?? []).length > 0)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    const firstMockup = (session: PhotoSession): SessionMockup =>
      [...session.mockups].sort((a, b) => a.position - b.position)[0];

    const areas = [...(product.printAreas ?? [])].sort(
      (a, b) => a.position - b.position,
    );
    const sources: DesignSource[] = [];
    for (const area of areas) {
      const session = sessions.find((s) => s.printAreaId === area.id);
      if (!session) continue;
      sources.push({
        printAreaId: area.id,
        printAreaName: area.name,
        session,
        mockup: firstMockup(session),
      });
    }
    if (sources.length === 0 && sessions[0]) {
      sources.push({
        printAreaId: null,
        printAreaName: null,
        session: sessions[0],
        mockup: firstMockup(sessions[0]),
      });
    }
    return sources;
  }

  /** Fuente a la que pertenece un smart object (por uuid), si alguna. */
  private findSourceBySmartObject(
    sources: DesignSource[],
    uuid: string,
  ): DesignSource | undefined {
    return sources.find((s) => this.designSmartObjectNames(s.mockup).has(uuid));
  }

  /** Nombre visible del área de una fuente. */
  private sourceAreaName(source: DesignSource): string {
    return (
      source.printAreaName ??
      [...this.designSmartObjectNames(source.mockup).values()].join(', ')
    );
  }

  /** Mapa uuid -> nombre de los smart objects "dise" de un mockup. */
  private designSmartObjectNames(mockup: SessionMockup): Map<string, string> {
    const smartObjects = (mockup.smartObjects ?? []) as SmartObject[];
    return new Map(
      this.findSmartObjects(smartObjects, 'dise').map((so) => [
        so.uuid,
        so.name ?? 'Diseño',
      ]),
    );
  }

  /**
   * Mapa uuid -> tamaño (px) de cada smart object "diseño" de TODAS las
   * sesiones/mockups del producto del diseño. Se usa para escalar la
   * geometría del placement (autorada en un área concreta) al área del mockup
   * destino cuando difieren en tamaño.
   */
  private buildDesignAreaSizeMap(
    design: Design,
  ): Map<string, { width: number; height: number }> {
    const map = new Map<string, { width: number; height: number }>();
    for (const session of design.product?.photoSessions ?? []) {
      for (const mockup of session.mockups ?? []) {
        for (const so of (mockup.smartObjects ?? []) as SmartObject[]) {
          if (!(so.name ?? '').toLowerCase().startsWith('dise')) continue;
          const w = so.size?.width;
          const h = so.size?.height;
          if (w && h) map.set(so.uuid, { width: w, height: h });
        }
      }
    }
    return map;
  }
}

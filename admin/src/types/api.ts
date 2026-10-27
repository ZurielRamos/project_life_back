// Tipos del contrato de la API de NestJS. Reflejan las respuestas que
// expone el backend (ver api/src/modules/*). Mantener en sincronía con él.

/** Rol en su forma pública (UserView.roles). */
export interface RoleRef {
  id: string
  name: string
}

/** Usuario público devuelto por /auth/login y /auth/register (UserView). */
export interface UserView {
  id: string
  email: string
  name: string | null
  isActive: boolean
  roles: RoleRef[]
  createdAt: string
  updatedAt: string
}

/**
 * Usuario autenticado devuelto por /auth/me, con roles y permisos
 * resueltos (AuthenticatedUser en el backend).
 */
export interface AuthenticatedUser {
  id: string
  email: string
  name?: string | null
  roles: string[]
  permissions: string[]
}

/** Respuesta de /auth/login y /auth/register. */
export interface AuthResult {
  accessToken: string
  user: UserView
}

export interface LoginPayload {
  email: string
  password: string
}

export interface RegisterPayload {
  email: string
  password: string
  name?: string
}

// --- SudoMock (plantillas) ---

/** Smart object de una plantilla de SudoMock (estructura mínima usada). */
export interface SmartObject {
  uuid: string
  name?: string
  [key: string]: unknown
}

/** Capa de texto editable de una plantilla. */
export interface TextLayer {
  uuid?: string
  name?: string
  text?: string
  [key: string]: unknown
}

/** Parámetros de paginación/filtro para listados remotos. */
export interface ListRemoteParams {
  limit?: number
  offset?: number
  name?: string
  /** Filtra por una cuenta de SudoMock; si se omite, agrega todas. */
  accountId?: string
}

// --- Productos ---

/**
 * Mockup importado de SudoMock y embebido dentro de una sesión de fotos
 * (entidad SessionMockup del backend). Incluye los datos del PSD y su
 * posición dentro de la sesión.
 */
export interface SessionMockup {
  id: string
  photoSessionId: string
  sudomockUuid: string
  /** Cuenta de SudoMock de origen. */
  sudomockAccountId: string
  sudomockName: string | null
  thumbnailUrl: string | null
  width: number | null
  height: number | null
  smartObjects: SmartObject[]
  textLayers: TextLayer[]
  raw: Record<string, unknown> | null
  /** Posición dentro de la sesión (0-based). */
  position: number
  createdAt: string
}

/** Sesión de fotos dentro de un producto. */
export interface PhotoSession {
  id: string
  name: string
  description: string | null
  productId: string
  /** Área de impresión a la que está anclada la sesión. */
  printAreaId: string | null
  printArea?: PrintArea | null
  /** Mockups embebidos, ordenados por position. En GET /products puede venir undefined. */
  mockups?: SessionMockup[]
  createdAt: string
  updatedAt: string
}

export type ProductFit = "men" | "women" | "unisex" | "kids" | "family"
export type MeasurementUnit = "cm" | "inch"

/** Info del modelo que aparece en las fotos. */
export interface ModelInfo {
  label?: string | null
  heightCm?: number | null
  weightKg?: number | null
  wearingSize?: string | null
}

/** Talla del producto con su nombre de etiqueta y medidas del size chart. */
export interface ProductSize {
  id: string
  productId: string
  name: string
  labelName: string | null
  /** Medidas por dimensión (claves = sizeChartColumns). */
  measurements: Record<string, number>
  position: number
}

/** Color disponible del producto. */
export interface ProductColor {
  id: string
  productId: string
  name: string
  hex: string
  position: number
}

/** Área de impresión del producto (tamaños físicos imprimibles). */
export interface PrintArea {
  id: string
  productId: string
  name: string
  widthMm: number | null
  heightMm: number | null
  maxWidthMm: number | null
  maxHeightMm: number | null
  technique: string | null
  sudomockSmartObjectUuid: string | null
  position: number
}

/** Producto. En GET /products las sesiones vienen sin mockups. */
export interface Product {
  id: string
  name: string
  description: string | null
  brand: string | null
  category: string | null
  composition: string | null
  careInstructions: string | null
  fit: ProductFit | null
  basePriceCents: number | null
  currency: string | null
  sizeChartUnit: MeasurementUnit
  sizeChartColumns: string[]
  modelInfo: ModelInfo | null
  sizes: ProductSize[]
  colors: ProductColor[]
  printAreas: PrintArea[]
  photoSessions: PhotoSession[]
  createdAt: string
  updatedAt: string
}

/**
 * Datos de una sesión de fotos (entrada). `sudomockUuids` es la selección
 * ordenada de plantillas a importar desde SudoMock al crear/editar.
 */
export interface PhotoSessionInput {
  name: string
  description?: string
  sudomockUuids?: string[]
  /** Área de impresión (del mismo producto) a la que se ancla la sesión. */
  printAreaId?: string
}

export interface CreateProductPayload {
  name: string
  description?: string
  photoSessions?: PhotoSessionInput[]
}

export interface UpdateProductPayload {
  name?: string
  description?: string
  brand?: string
  category?: string
  composition?: string
  careInstructions?: string
  fit?: ProductFit
  basePriceCents?: number
  currency?: string
  sizeChartUnit?: MeasurementUnit
  sizeChartColumns?: string[]
  modelInfo?: ModelInfo
}

/** Talla (entrada) para reemplazar el conjunto de tallas. */
export interface ProductSizeInput {
  name: string
  labelName?: string
  measurements?: Record<string, number>
}

export interface SetSizesPayload {
  sizes: ProductSizeInput[]
}

/** Color (entrada) para reemplazar el conjunto de colores. */
export interface ProductColorInput {
  name: string
  hex: string
}

export interface SetColorsPayload {
  colors: ProductColorInput[]
}

/** Área de impresión (entrada) para reemplazar el conjunto de áreas. */
export interface PrintAreaInput {
  name: string
  widthMm?: number
  heightMm?: number
  maxWidthMm?: number
  maxHeightMm?: number
  technique?: string
  sudomockSmartObjectUuid?: string
}

export interface SetPrintAreasPayload {
  printAreas: PrintAreaInput[]
}

/** Body para importar plantillas de SudoMock a una sesión. */
export interface ImportSessionMockupsPayload {
  sudomockUuids: string[]
  /** Cuenta de SudoMock de origen de los uuids. */
  accountId?: string
}

/** Body para reordenar los mockups de una sesión (ids de SessionMockup). */
export interface ReorderMockupsPayload {
  sessionMockupIds: string[]
}

/**
 * Plantilla del catálogo remoto de SudoMock (GET /products/mockups/remote).
 * Es la forma que devuelve el SDK de SudoMock; no hay estado local de
 * importación porque cada sesión guarda su propia copia al importar.
 */
export interface RemoteSudomockMockup {
  uuid: string
  name: string
  thumbnail?: string | null
  width?: number | null
  height?: number | null
  smartObjects?: SmartObject[]
  textLayers?: TextLayer[]
  /** Cuenta de SudoMock de la que proviene esta plantilla. */
  accountId: string
  [key: string]: unknown
}

/** Cuenta de SudoMock configurada. */
export interface SudomockAccount {
  id: string
  label: string
}

/** Respuesta del catálogo remoto agregado (posiblemente varias cuentas). */
export interface RemoteSudomockListResult {
  mockups: RemoteSudomockMockup[]
  total: number
  /** Cuentas disponibles, para ofrecer un filtro en la UI. */
  accounts: SudomockAccount[]
}

// --- Diseños ---

/** Imagen colocada dentro de un área de impresión (geometría en mm). */
export interface DesignPlacement {
  id: string
  designId: string
  printAreaId: string
  imageUrl: string
  imagePublicId: string | null
  xMm: number
  yMm: number
  widthMm: number
  heightMm: number
  rotation: number
  zIndex: number
}

/** Estado del ciclo de vida del diseño. */
export type DesignStatus = "draft" | "generating" | "ready" | "failed"

/** Estado de un render individual. */
export type DesignRenderStatus = "pending" | "processing" | "done" | "failed"

/**
 * Un render concreto del diseño: combinación de área, sesión, mockup y
 * color. Se agrupan por color en la UI.
 */
export interface DesignRender {
  id: string
  designId: string
  printAreaId: string
  printAreaName: string | null
  sessionId: string
  sessionName: string | null
  sessionMockupId: string
  sudomockUuid: string
  colorId: string | null
  colorName: string | null
  colorHex: string | null
  status: DesignRenderStatus
  imageUrl: string | null
  errorMessage: string | null
  position: number
  createdAt: string
  updatedAt: string
}

/** Diseño sobre un producto. */
export interface Design {
  id: string
  name: string
  productId: string
  /** Estado de generación de renders/SEO. */
  status: DesignStatus
  /** Mensaje de error de la última generación fallida (si aplica). */
  errorMessage: string | null
  /** En GET /designs/:id viene con sus áreas de impresión. */
  product?: Product
  placements: DesignPlacement[]
  /** Renders generados (uno por sesión×mockup×color). */
  renders?: DesignRender[]
  /** Contenido SEO generado por IA (si ya se generó). */
  seo?: DesignSeoView | null
  createdAt: string
  updatedAt: string
}

/** Estado ligero para polling del progreso de generación. */
export interface DesignStatusView {
  id: string
  status: DesignStatus
  errorMessage: string | null
  total: number
  done: number
  failed: number
}

/** Body para crear un diseño y encolar la generación de renders. */
export interface GenerateDesignPayload {
  productId: string
  placements: PlacementInput[]
  /** Colores (ids del producto) a generar, en orden. */
  colorIds?: string[]
}

/** Body para una vista previa efímera (no persiste nada). */
export interface PreviewDesignPayload {
  productId: string
  printAreaId: string
  placements: PlacementInput[]
  /** Color (id del producto) a renderizar. */
  colorId?: string
}

export interface UpdateDesignPayload {
  name?: string
}

/** Resultado de subir una imagen a Cloudinary. */
export interface UploadedImage {
  url: string
  publicId: string
  width: number
  height: number
  format: string
  bytes: number
}

/** Una colocación (entrada) para guardar el diseño. */
export interface PlacementInput {
  printAreaId: string
  imageUrl: string
  imagePublicId?: string
  xMm: number
  yMm: number
  widthMm: number
  heightMm: number
  rotation?: number
  zIndex?: number
}

export interface SetPlacementsPayload {
  placements: PlacementInput[]
}

/** SEO generado por IA para un diseño. */
export interface DesignSeoView {
  title: string
  slug: string
  metaTitle: string | null
  metaDescription: string | null
  description: string
  keywords: string[]
  jsonLd: Record<string, unknown> | null
  openGraph: Record<string, unknown> | null
}

/** Resultado de una vista previa efímera (un render + SEO, sin persistir). */
export interface PreviewResult {
  printAreaId: string
  imageUrl: string
  seo: DesignSeoView | null
}

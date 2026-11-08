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
  /** URL del avatar subido (opcional; si falta se genera uno con iniciales). */
  avatarUrl?: string | null
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
  /** URL del avatar subido (opcional; si falta se genera uno con iniciales). */
  avatarUrl?: string | null
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
  /** Tamaño del smart object en px de la plantilla. */
  size?: { width: number; height: number }
  /** Posición/caja del smart object en la plantilla. */
  position?: { x: number; y: number; width: number; height: number }
  [key: string]: unknown
}

/**
 * Área de diseño derivada de un smart object "dise" del primer mockup de la
 * primera sesión. Las dimensiones están en px de la plantilla (B1): el
 * lienzo trabaja en ese espacio y el render mapea por `smartObjectUuid`.
 */
export interface DesignArea {
  /** uuid del smart object; viaja como `printAreaId` en los payloads. */
  smartObjectUuid: string
  name: string
  widthPx: number
  heightPx: number
}

/**
 * Área de impresión del producto con sus objetos inteligentes de diseño.
 * Cada área toma los smart objects "dise" del primer mockup de su primera
 * sesión anclada; cada objeto es un lienzo (`DesignArea`) independiente.
 */
export interface DesignPrintArea {
  /** id del área de impresión, o "legacy" si las sesiones no están ancladas. */
  id: string
  name: string
  objects: DesignArea[]
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

/** Clave (slug) de un ajuste administrable, p.ej. "men". */
export type ProductFit = string
export type MeasurementUnit = "cm" | "inch"

/** Ajuste administrable del catálogo (Hombre, Mujer, ...). */
export interface Fit {
  id: string
  /** Identificador estable que guardan los productos. */
  key: ProductFit
  /** Nombre visible. */
  name: string
  position: number
  createdAt: string
  updatedAt: string
}

/**
 * Categoría administrable que pertenece a un ajuste. Cada ajuste tiene su
 * propio conjunto de categorías.
 */
export interface FitCategory {
  id: string
  /** Ajuste al que pertenece. */
  fit: ProductFit
  /** Nombre visible, p.ej. "Oversize". */
  name: string
  position: number
  createdAt: string
  updatedAt: string
}

/** Body para crear una categoría dentro de un ajuste. */
export interface CreateFitCategoryPayload {
  fit: ProductFit
  name: string
}

/** Tipografía registrada para plantillas SVG. */
export interface Font {
  id: string
  family: string
  fileUrl: string
  filePublicId: string
  format: string | null
  createdAt: string
  updatedAt: string
}

/** Body para registrar una fuente (archivo como data URI). */
export interface CreateFontPayload {
  family: string
  dataUri: string
  format?: string
}

/** Un campo de texto a sustituir, con su alineación respecto al original. */
export interface RenderSvgField {
  key: string
  value: string
  anchorX: number
  anchorY: number
  textAnchor: "start" | "middle" | "end"
}

/** Body para rasterizar una plantilla SVG. */
export interface RenderSvgPayload {
  svg: string
  fields?: RenderSvgField[]
  targetWidth?: number
}

/** Resultado de rasterizar un SVG: imagen + SVG fuente + fuentes faltantes. */
export interface RenderSvgResult {
  image: UploadedImage
  svgUrl: string
  svgPublicId: string
  missingFonts: string[]
}

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
  /** Precio específico de la talla en centavos (null = usar precio base). */
  priceCents: number | null
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

/**
 * Resumen de producto que devuelve GET /products (para la grilla). Trae los
 * contadores y la miniatura de portada en vez del detalle completo.
 */
export interface ProductSummary {
  id: string
  name: string
  description: string | null
  /** Cantidad de sesiones de fotos. */
  sessionCount: number
  /** Cantidad de colores configurados. */
  colorCount: number
  /** Cantidad de tallas configuradas. */
  sizeCount: number
  /** Miniatura del primer mockup de la primera sesión (o null). */
  coverThumbnailUrl: string | null
  createdAt: string
  updatedAt: string
}

/** Producto completo (GET /products/:id). */
export interface Product {
  id: string
  name: string
  description: string | null
  brand: string | null
  category: string | null
  composition: string | null
  careInstructions: string | null
  fit: ProductFit | null
  /** Categoría del ajuste (pertenece a `fit`). */
  fitCategoryId: string | null
  fitCategory: FitCategory | null
  /** Precio de venta en centavos. */
  basePriceCents: number | null
  /** Precio de costo en centavos. */
  costPriceCents: number | null
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
  /** Categoría del ajuste; `null` la limpia. */
  fitCategoryId?: string | null
  basePriceCents?: number
  costPriceCents?: number
  currency?: string
  sizeChartUnit?: MeasurementUnit
  sizeChartColumns?: string[]
  modelInfo?: ModelInfo
}

/** Talla (entrada) para reemplazar el conjunto de tallas. */
export interface ProductSizeInput {
  name: string
  labelName?: string
  /** Precio por talla en centavos (opcional; null/omitido = precio base). */
  priceCents?: number | null
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

/** Vínculo de compatibilidad: área de este producto ↔ área de otro producto. */
export interface CompatibilityLink {
  printAreaId: string
  compatiblePrintAreaId: string
  compatibleProductId: string
  compatibleProductName: string
  compatibleAreaName: string
}

/** Producto (con sus áreas) con el que se puede vincular compatibilidad. */
export interface CompatibilityOption {
  id: string
  name: string
  printAreas: { id: string; name: string }[]
}

/** Entrada para reemplazar las compatibilidades del producto. */
export interface SetCompatibilitiesPayload {
  links: { printAreaId: string; compatiblePrintAreaId: string }[]
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
  /** SVG fuente (si la imagen se generó desde una plantilla). */
  svgUrl: string | null
  fieldValues: Record<string, string> | null
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

/**
 * Resumen de diseño para la grilla (GET /designs). Trae la portada y el
 * flag de editable en vez del detalle completo.
 */
export interface DesignSummary {
  id: string
  name: string
  status: DesignStatus
  /** Producto base del diseño. */
  productId: string
  productName: string | null
  /** Primera imagen de render lograda (portada), o null. */
  coverImageUrl: string | null
  /** true si el diseño tiene algún SVG editable. */
  editable: boolean
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
  /** Área de impresión principal (id de PrintArea), si se eligió. */
  mainPrintAreaId?: string | null
  /** true si el diseño tiene copyright (se puede ocultar de la tienda). */
  hasCopyright?: boolean
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
  /** Área de impresión principal (id de PrintArea); sus renders van primero. */
  mainPrintAreaId?: string
  /** Otros productos (compatibles) para los que crear el mismo diseño. */
  compatibleProducts?: { productId: string; colorIds: string[] }[]
  /** Si el diseño tiene copyright. */
  hasCopyright: boolean
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
  /** Tamaño (px) del área de diseño contra la que se autoró la geometría. */
  authorAreaWidthPx?: number
  authorAreaHeightPx?: number
  zIndex?: number
  /** Si la imagen vino de una plantilla SVG: su origen para re-edición. */
  svgUrl?: string
  fieldValues?: Record<string, string>
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

// --- Usuarios, roles y permisos ---

/**
 * Permiso atómico del sistema (entidad Permission del backend).
 * El `name` sigue el formato "recurso:accion" (ej. "users:create").
 */
export interface Permission {
  id: string
  name: string
  resource: string
  action: string
  description: string | null
  createdAt: string
  updatedAt: string
}

/**
 * Rol con sus permisos resueltos (entidad Role del backend).
 * Los roles son contenedores de permisos; la autorización se evalúa
 * por permiso, no por nombre de rol.
 */
export interface Role {
  id: string
  name: string
  description: string | null
  /** Marca los roles del sistema (ej. "admin"); no se pueden borrar ni renombrar. */
  isSystem: boolean
  permissions: Permission[]
  createdAt: string
  updatedAt: string
}

/** Payload para crear un rol (POST /roles). */
export interface CreateRolePayload {
  name: string
  description?: string
  /** IDs de los permisos a asociar al rol. */
  permissionIds?: string[]
}

/** Payload para actualizar un rol (PATCH /roles/:id). */
export interface UpdateRolePayload {
  name?: string
  description?: string
  permissionIds?: string[]
}

/** Payload para crear un usuario (POST /users). */
export interface CreateUserPayload {
  email: string
  password: string
  name?: string
  /** IDs de los roles a asignar al usuario. */
  roleIds?: string[]
}

/** Payload para actualizar un usuario (PATCH /users/:id). */
export interface UpdateUserPayload {
  email?: string
  /** Solo se envía si se quiere cambiar la contraseña. */
  password?: string
  name?: string
  isActive?: boolean
  roleIds?: string[]
}

// --- Tiendas ---

/** Redes sociales de una tienda (todas opcionales). */
export interface StoreSocialLinks {
  instagram?: string
  facebook?: string
  tiktok?: string
  x?: string
  youtube?: string
  pinterest?: string
  whatsapp?: string
}

/** Campos comunes de una tienda. */
interface StoreBase {
  id: string
  name: string
  slug: string
  isActive: boolean
  /** Muestra «Crea tu propia camiseta» en la ficha de producto. */
  customDesignerEnabled: boolean
  title: string | null
  tagline: string | null
  description: string | null
  logoUrl: string | null
  faviconUrl: string | null
  primaryColor: string | null
  /** Segundo color de marca (final de los degradados). */
  secondaryColor: string | null
  contactEmail: string | null
  phone: string | null
  address: string | null
  socialLinks: StoreSocialLinks
  currency: string
  locale: string
  seoTitle: string | null
  seoDescription: string | null
  /** Dominio personalizado (host sin protocolo) o null. */
  domain: string | null
  /** URL pública por subdominio (<slug>.<dominio base>) o null si no está configurada. */
  publicUrl: string | null
  createdAt: string
  updatedAt: string
}

/** Fila del listado (GET /stores): trae contadores del catálogo. */
export interface StoreSummary extends StoreBase {
  productCount: number
  designCount: number
}

/** Tienda completa (GET /stores/:id) con los ids del catálogo publicado. */
export interface Store extends StoreBase {
  productIds: string[]
  designIds: string[]
  /** Configuración del sitio web, ya resuelta con los valores por defecto. */
  siteConfig: SiteConfig
}

/** Payload para crear una tienda (POST /stores). */
export interface CreateStorePayload {
  name: string
  slug: string
  isActive?: boolean
}

/**
 * Payload para actualizar una tienda (PATCH /stores/:id). Una cadena vacía
 * limpia el campo. Los ids de catálogo reemplazan el conjunto completo.
 */
export interface UpdateStorePayload {
  name?: string
  slug?: string
  isActive?: boolean
  title?: string
  tagline?: string
  description?: string
  logoUrl?: string
  faviconUrl?: string
  primaryColor?: string
  secondaryColor?: string
  contactEmail?: string
  phone?: string
  address?: string
  socialLinks?: StoreSocialLinks
  currency?: string
  locale?: string
  seoTitle?: string
  seoDescription?: string
  productIds?: string[]
  designIds?: string[]
  /** Secciones del sitio a actualizar; cada una reemplaza a la anterior. */
  siteConfig?: Partial<SiteConfig>
}

// --- Configuración del sitio web de la tienda ---

export type SiteFit = "women" | "family" | "men" | "unisex" | "kids"

export interface SiteLink {
  label: string
  url: string
}

export interface AnnouncementConfig {
  enabled: boolean
  text: string
  linkLabel: string
  linkUrl: string
  backgroundColor: string
  textColor: string
}

/**
 * Disposición del encabezado:
 * - logo-center: menú a la izquierda, logo al centro, iconos a la derecha.
 * - logo-left: logo a la izquierda con el menú a su lado.
 * - logo-left-menu-center: logo a la izquierda y menú centrado.
 * - logo-right: menú a la izquierda, iconos y logo a la derecha.
 * - stacked: logo centrado arriba y menú centrado debajo.
 */
export type HeaderLayout =
  | "logo-center"
  | "logo-left"
  | "logo-left-menu-center"
  | "logo-right"
  | "stacked"

export interface HeaderConfig {
  navItems: SiteLink[]
  layout: HeaderLayout
  /** transparent: sobre la portada y oscuro al bajar; dark/light: fijo. */
  appearance: "transparent" | "dark" | "light"
  logoSize: "sm" | "md" | "lg"
  menuCase: "as-typed" | "uppercase"
  sticky: boolean
  showSearch: boolean
  showFavorites: boolean
  showAccount: boolean
  mobileMenu: boolean
}

export interface FooterColumn {
  title: string
  links: SiteLink[]
}

export interface FooterConfig {
  about: string
  columns: FooterColumn[]
  legalLinks: SiteLink[]
  copyright: string
  showSocial: boolean
  showContactInfo: boolean
  layout: "columns" | "centered" | "compact"
  appearance: "dark" | "light" | "brand"
  showLogo: boolean
  logoSize: "sm" | "md" | "lg"
  mobileColumns: "hidden" | "accordion" | "visible"
  cta: SiteLink
  bottomNote: string
  showBackToTop: boolean
}

export interface FaqItem {
  question: string
  answer: string
}

export interface ContactPageConfig {
  enabled: boolean
  title: string
  intro: string
  showForm: boolean
  formButtonLabel: string
  whatsappMessage: string
  hours: string
  mapEmbedUrl: string
  faqTitle: string
  faqs: FaqItem[]
}

export interface SitePage {
  slug: string
  title: string
  content: string
  published: boolean
  /** Se enlaza automáticamente en la franja inferior del pie. */
  inFooter: boolean
}

export interface IntegrationsConfig {
  googleAnalyticsId: string
  metaPixelId: string
  googleSiteVerification: string
}

export type DefaultTileImage =
  | ""
  | "bg_mujer"
  | "bg_familia"
  | "bg_hombre"
  | "bg_hoodie"
  | "bg_kids"

export interface CategoryTileConfig {
  id: string
  enabled: boolean
  title: string
  kicker: string
  cta: string
  url: string
  imageUrl: string
  mobileImageUrl: string
  defaultImage: DefaultTileImage
}

interface HomeSectionBase {
  id: string
  enabled: boolean
}

export interface HeroSection extends HomeSectionBase {
  type: "hero"
  kicker: string
  titleLine: string
  titleAccent: string
  subtitle: string
  searchPlaceholder: string
  suggestions: string[]
  chips: SiteLink[]
  imageUrl: string
  mobileImageUrl: string
  height: HeroHeight
  mobileHeight: HeroHeight
  align: "left" | "center" | "right"
  vAlign: "top" | "center" | "bottom"
  /** Oscurecido sobre la imagen, 0–80 (%). */
  overlay: number
  textPanel: "glass" | "solid" | "none"
  textColor: "light" | "dark"
  imagePosition: "center" | "top" | "bottom" | "left" | "right"
  zoom: boolean
  showSearch: boolean
  showScroll: boolean
  primaryCta: SiteLink
  secondaryCta: SiteLink
}

export type HeroHeight = "full" | "large" | "half" | "auto"

export interface CategoriesSection extends HomeSectionBase {
  type: "categories"
  tiles: CategoryTileConfig[]
}

export type FeaturedSort =
  | "newest"
  | "oldest"
  | "price-asc"
  | "price-desc"
  | "random"

export interface FeaturedSection extends HomeSectionBase {
  type: "featured"
  title: string
  subtitle: string
  /** auto = consulta con filtros; manual = diseños elegidos, en orden. */
  mode: "auto" | "manual"
  /** Clave del ajuste administrable; vacío = todos. */
  fit: string
  category: string
  /** Búsqueda por texto. */
  query: string
  /** Producto base; vacío = todos. */
  productId: string
  sort: FeaturedSort
  /** Diseños elegidos (modo manual), en orden. */
  designIds: string[]
  /** Máximo de productos (2 a 24). */
  limit: number
  /** Columnas en escritorio. */
  columns: 3 | 4 | 5
  /** Imagen de la tarjeta: posición 1, 2, 3 o aleatoria. */
  image: "1" | "2" | "3" | "random"
  /** En aleatoria, posición excluida (0 = ninguna). */
  randomExclude: 0 | 1 | 2 | 3
  ctaLabel: string
  ctaUrl: string
}

export interface BannerSection extends HomeSectionBase {
  type: "banner"
  title: string
  text: string
  imageUrl: string
  mobileImageUrl: string
  buttonLabel: string
  buttonUrl: string
  align: "left" | "center" | "right"
}

export interface TextSection extends HomeSectionBase {
  type: "text"
  title: string
  body: string
  align: "left" | "center"
}

export type HomeSection =
  | HeroSection
  | CategoriesSection
  | FeaturedSection
  | BannerSection
  | TextSection

export interface SiteConfig {
  announcement: AnnouncementConfig
  header: HeaderConfig
  footer: FooterConfig
  home: { sections: HomeSection[] }
  contact: ContactPageConfig
  pages: SitePage[]
  integrations: IntegrationsConfig
}

// --- Notificaciones de la tienda (SMTP / WhatsApp) ---

/** Ajustes de notificaciones tal como los devuelve la API (sin secretos). */
export interface NotificationsView {
  smtp: {
    enabled: boolean
    host: string
    port: number
    secure: boolean
    username: string
    fromName: string
    fromEmail: string
    /** true si hay una contraseña guardada; su valor nunca se devuelve. */
    hasPassword: boolean
  }
  whatsapp: {
    enabled: boolean
    apiUrl: string
    accountSlug: string
    channelId: string
    templateName: string
    languageCode: string
    /** true si hay un token guardado; su valor nunca se devuelve. */
    hasApiToken: boolean
    /** Endpoint resultante de la URL y el slug de la cuenta. */
    endpoint: string | null
  }
  updatedAt: string | null
}

/** Cambios de SMTP. Los campos omitidos no se modifican. */
export interface SmtpSettingsPayload {
  enabled?: boolean
  host?: string
  port?: number
  secure?: boolean
  username?: string
  /** Contraseña nueva. Omitida o vacía = se conserva la guardada. */
  password?: string
  clearPassword?: boolean
  fromName?: string
  fromEmail?: string
}

/** Cambios de WhatsApp. Los campos omitidos no se modifican. */
export interface WhatsappSettingsPayload {
  enabled?: boolean
  apiUrl?: string
  accountSlug?: string
  channelId?: string
  templateName?: string
  languageCode?: string
  /** Token nuevo. Omitido o vacío = se conserva el guardado. */
  apiToken?: string
  clearApiToken?: boolean
}

export interface UpdateNotificationsPayload {
  smtp?: SmtpSettingsPayload
  whatsapp?: WhatsappSettingsPayload
}

export interface NotificationTestResult {
  ok: true
  message: string
}

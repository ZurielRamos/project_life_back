/**
 * Configuración del sitio web de una tienda (apariencia y contenido).
 *
 * Se guarda en `stores.site_config` (jsonb) solo con las secciones que el
 * usuario editó. Al leerla se "resuelve": cada sección se normaliza y se
 * completa con los valores por defecto, que reproducen el sitio original.
 *
 * Toda entrada pasa por los normalizadores de este archivo, que descartan lo
 * que no es válido (URLs peligrosas, colores mal formados, listas enormes…).
 * Así el front puede confiar en la forma de los datos.
 */

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

export type ProductFitKey = 'women' | 'family' | 'men' | 'unisex' | 'kids';

export interface SiteLink {
  label: string;
  url: string;
}

export interface AnnouncementConfig {
  enabled: boolean;
  text: string;
  linkLabel: string;
  linkUrl: string;
  backgroundColor: string;
  textColor: string;
}

/**
 * Disposición del encabezado:
 * - logo-center: menú a la izquierda, logo al centro, iconos a la derecha.
 * - logo-left: logo a la izquierda con el menú a su lado, iconos a la derecha.
 * - logo-left-menu-center: logo a la izquierda, menú centrado, iconos a la derecha.
 * - logo-right: menú a la izquierda, iconos y logo a la derecha.
 * - stacked: logo centrado arriba y el menú centrado en una segunda fila.
 */
export type HeaderLayout =
  | 'logo-center'
  | 'logo-left'
  | 'logo-left-menu-center'
  | 'logo-right'
  | 'stacked';

/**
 * Fondo del encabezado:
 * - transparent: transparente sobre la portada y oscuro translúcido al bajar;
 *   en las demás páginas, claro.
 * - dark: oscuro en todas las páginas.
 * - light: claro en todas las páginas.
 */
export type HeaderAppearance = 'transparent' | 'dark' | 'light';

export interface HeaderConfig {
  navItems: SiteLink[];
  layout: HeaderLayout;
  appearance: HeaderAppearance;
  logoSize: 'sm' | 'md' | 'lg';
  /** Cómo se escriben los enlaces del menú. */
  menuCase: 'as-typed' | 'uppercase';
  /** Fijo arriba al hacer scroll (true) o se desplaza con la página (false). */
  sticky: boolean;
  showSearch: boolean;
  showFavorites: boolean;
  showAccount: boolean;
  /** Botón de menú (hamburguesa) en móvil con los enlaces del menú. */
  mobileMenu: boolean;
}

export interface FooterColumn {
  title: string;
  links: SiteLink[];
}

export interface FooterConfig {
  /** Texto bajo el logo. Vacío = eslogan/descripción de la tienda. */
  about: string;
  columns: FooterColumn[];
  legalLinks: SiteLink[];
  /** Texto de copyright. Vacío = "© año Nombre. Todos los derechos reservados." */
  copyright: string;
  showSocial: boolean;
  showContactInfo: boolean;
  /** Distribución: marca + columnas, todo centrado, o una sola fila. */
  layout: 'columns' | 'centered' | 'compact';
  appearance: 'dark' | 'light' | 'brand';
  showLogo: boolean;
  logoSize: 'sm' | 'md' | 'lg';
  /** Columnas de enlaces en móvil: ocultas, desplegables o visibles. */
  mobileColumns: 'hidden' | 'accordion' | 'visible';
  /** Botón destacado bajo la descripción (se muestra si tiene texto y destino). */
  cta: SiteLink;
  /** Texto corto extra en la franja inferior (p. ej. "Envíos a todo el país"). */
  bottomNote: string;
  showBackToTop: boolean;
}

export interface FaqItem {
  question: string;
  answer: string;
}

export interface ContactPageConfig {
  enabled: boolean;
  title: string;
  intro: string;
  showForm: boolean;
  formButtonLabel: string;
  /** Mensaje inicial del chat de WhatsApp. */
  whatsappMessage: string;
  hours: string;
  /** URL de inserción de Google Maps (https://www.google.com/maps/embed?...). */
  mapEmbedUrl: string;
  faqTitle: string;
  faqs: FaqItem[];
}

export interface SitePage {
  slug: string;
  title: string;
  /** Texto con formato simple (markdown reducido). */
  content: string;
  published: boolean;
  /** Se enlaza automáticamente en la franja inferior del pie (páginas legales). */
  inFooter: boolean;
}

export interface IntegrationsConfig {
  googleAnalyticsId: string;
  metaPixelId: string;
  googleSiteVerification: string;
}

export type DefaultTileImage =
  '' | 'bg_mujer' | 'bg_familia' | 'bg_hombre' | 'bg_hoodie' | 'bg_kids';

export interface CategoryTileConfig {
  id: string;
  enabled: boolean;
  title: string;
  kicker: string;
  cta: string;
  url: string;
  /** Imagen propia (https). Vacío = imagen por defecto de la plataforma. */
  imageUrl: string;
  mobileImageUrl: string;
  defaultImage: DefaultTileImage;
}

interface HomeSectionBase {
  id: string;
  enabled: boolean;
}

export interface HeroSection extends HomeSectionBase {
  type: 'hero';
  /** Vacío = eslogan de la tienda. */
  kicker: string;
  titleLine: string;
  titleAccent: string;
  subtitle: string;
  searchPlaceholder: string;
  suggestions: string[];
  chips: SiteLink[];
  imageUrl: string;
  mobileImageUrl: string;
  /** Alto en escritorio y en móvil. */
  height: HeroHeight;
  mobileHeight: HeroHeight;
  align: 'left' | 'center' | 'right';
  vAlign: 'top' | 'center' | 'bottom';
  /** Oscurecido sobre la imagen, 0–80 (%). */
  overlay: number;
  textPanel: 'glass' | 'solid' | 'none';
  textColor: 'light' | 'dark';
  /** Punto de la imagen que se mantiene visible al recortar. */
  imagePosition: 'center' | 'top' | 'bottom' | 'left' | 'right';
  zoom: boolean;
  showSearch: boolean;
  showScroll: boolean;
  /** Botones opcionales (se muestran si tienen texto y destino). */
  primaryCta: SiteLink;
  secondaryCta: SiteLink;
}

export const HERO_HEIGHTS = ['full', 'large', 'half', 'auto'] as const;
export type HeroHeight = (typeof HERO_HEIGHTS)[number];

export interface CategoriesSection extends HomeSectionBase {
  type: 'categories';
  tiles: CategoryTileConfig[];
}

export type FeaturedSort =
  'newest' | 'oldest' | 'price-asc' | 'price-desc' | 'random';

/**
 * Productos destacados. En modo "auto" se arma una consulta con los filtros;
 * en modo "manual" se muestran los diseños elegidos, en ese orden.
 */
export interface FeaturedSection extends HomeSectionBase {
  type: 'featured';
  title: string;
  subtitle: string;
  mode: 'auto' | 'manual';
  /** Clave del ajuste (fit) administrable; vacío = todos. */
  fit: string;
  /** Categoría del producto (texto); vacío = todas. */
  category: string;
  /** Búsqueda por texto en el nombre del diseño o del producto. */
  query: string;
  /** Producto base (uuid); vacío = todos. */
  productId: string;
  sort: FeaturedSort;
  /** Diseños elegidos a mano (modo manual), en orden. */
  designIds: string[];
  /** Máximo de productos a mostrar. */
  limit: number;
  /** Columnas de la cuadrícula en escritorio. */
  columns: 3 | 4 | 5;
  /** Imagen de la tarjeta: posición 1, 2, 3 o aleatoria. */
  image: '1' | '2' | '3' | 'random';
  /** En aleatoria, posición que nunca se elige (0 = ninguna). */
  randomExclude: 0 | 1 | 2 | 3;
  ctaLabel: string;
  ctaUrl: string;
}

export interface BannerSection extends HomeSectionBase {
  type: 'banner';
  title: string;
  text: string;
  imageUrl: string;
  mobileImageUrl: string;
  buttonLabel: string;
  buttonUrl: string;
  align: 'left' | 'center' | 'right';
}

export interface TextSection extends HomeSectionBase {
  type: 'text';
  title: string;
  body: string;
  align: 'left' | 'center';
}

export type HomeSection =
  | HeroSection
  | CategoriesSection
  | FeaturedSection
  | BannerSection
  | TextSection;

export interface SiteConfig {
  announcement: AnnouncementConfig;
  header: HeaderConfig;
  footer: FooterConfig;
  home: { sections: HomeSection[] };
  contact: ContactPageConfig;
  pages: SitePage[];
  integrations: IntegrationsConfig;
}

export const SITE_CONFIG_KEYS = [
  'announcement',
  'header',
  'footer',
  'home',
  'contact',
  'pages',
  'integrations',
] as const satisfies readonly (keyof SiteConfig)[];

// ---------------------------------------------------------------------------
// Límites
// ---------------------------------------------------------------------------

const MAX_NAV_ITEMS = 8;
const MAX_FOOTER_COLUMNS = 4;
const MAX_LINKS_PER_COLUMN = 10;
const MAX_LEGAL_LINKS = 6;
const MAX_FAQS = 12;
const MAX_PAGES = 20;
const MAX_HOME_SECTIONS = 12;
const MAX_TILES = 8;
/** Máximo de productos en una sección de destacados. */
const MAX_FEATURED = 24;
const MAX_CHIPS = 8;
const MAX_SUGGESTIONS = 10;
const MAX_PAGE_CONTENT = 10_000;

const FITS: readonly ProductFitKey[] = [
  'women',
  'family',
  'men',
  'unisex',
  'kids',
];
const TILE_IMAGES: readonly DefaultTileImage[] = [
  '',
  'bg_mujer',
  'bg_familia',
  'bg_hombre',
  'bg_hoodie',
  'bg_kids',
];

// ---------------------------------------------------------------------------
// Utilidades de saneamiento
// ---------------------------------------------------------------------------

type Json = Record<string, unknown>;

const isObj = (v: unknown): v is Json =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

const str = (v: unknown, max: number): string =>
  typeof v === 'string' ? v.trim().slice(0, max) : '';

const bool = (v: unknown, fallback: boolean): boolean =>
  typeof v === 'boolean' ? v : fallback;

const oneOf = <T extends string>(
  v: unknown,
  allowed: readonly T[],
  fallback: T,
): T =>
  typeof v === 'string' && (allowed as readonly string[]).includes(v)
    ? (v as T)
    : fallback;

const int = (
  v: unknown,
  min: number,
  max: number,
  fallback: number,
): number => {
  const n = typeof v === 'number' ? v : Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.round(n)));
};

const HEX = /^#[0-9a-fA-F]{6}$/;
const color = (v: unknown, fallback: string): string =>
  typeof v === 'string' && HEX.test(v.trim()) ? v.trim() : fallback;

/**
 * Enlace de navegación: ruta interna (/…, #…), http(s), mailto: o tel:.
 * Cualquier otro esquema (javascript:, data:…) se descarta.
 */
const link = (v: unknown): string => {
  const s = str(v, 2048);
  if (!s) return '';
  if (/^(\/(?!\/)|#)/.test(s)) return s;
  if (/^https?:\/\/[^\s]+$/i.test(s)) return s;
  if (/^(mailto|tel):[^\s]+$/i.test(s)) return s;
  return '';
};

/** URL de imagen: solo http(s). */
const imageUrl = (v: unknown): string => {
  const s = str(v, 2048);
  return /^https?:\/\/[^\s]+$/i.test(s) ? s : '';
};

const slug = (v: unknown, max = 60): string => {
  const s = str(v, max).toLowerCase();
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(s) ? s : '';
};

/** Aplica `fn` a cada elemento válido de una lista, con tope de longitud. */
function list<T>(
  v: unknown,
  max: number,
  fn: (item: unknown, index: number) => T | null,
): T[] {
  if (!Array.isArray(v)) return [];
  const out: T[] = [];
  for (let i = 0; i < v.length && out.length < max; i++) {
    const item = fn(v[i], i);
    if (item !== null) out.push(item);
  }
  return out;
}

const siteLink = (v: unknown): SiteLink | null => {
  if (!isObj(v)) return null;
  const label = str(v.label, 60);
  if (!label) return null;
  return { label, url: link(v.url) };
};

// ---------------------------------------------------------------------------
// Valores por defecto (reproducen el sitio original)
// ---------------------------------------------------------------------------

export function defaultSiteConfig(): SiteConfig {
  return {
    announcement: {
      enabled: false,
      text: '',
      linkLabel: '',
      linkUrl: '',
      backgroundColor: '#0b0b0b',
      textColor: '#ffffff',
    },
    header: {
      layout: 'logo-center',
      appearance: 'transparent',
      logoSize: 'md',
      menuCase: 'as-typed',
      sticky: true,
      showSearch: true,
      // La página /favoritos aún no existe: el icono queda apagado por defecto.
      showFavorites: false,
      showAccount: true,
      mobileMenu: true,
      navItems: [
        { label: 'MUJER', url: '/tienda?fit=women' },
        { label: 'FAMILIAR', url: '/tienda?fit=family' },
        { label: 'HOMBRE', url: '/tienda?fit=men' },
        { label: 'UNISEX', url: '/tienda?fit=unisex' },
        { label: 'KIDS', url: '/tienda?fit=kids' },
      ],
    },
    footer: {
      about: '',
      columns: [
        {
          title: 'Comprar',
          links: [
            { label: 'Mujer', url: '/tienda?fit=women' },
            { label: 'Hombre', url: '/tienda?fit=men' },
            { label: 'Unisex', url: '/tienda?fit=unisex' },
            { label: 'Kids', url: '/tienda?fit=kids' },
            { label: 'Todo el catálogo', url: '/tienda' },
          ],
        },
        {
          title: 'Ayuda',
          links: [{ label: 'Contacto', url: '/contacto' }],
        },
      ],
      legalLinks: [],
      copyright: '',
      showSocial: true,
      showContactInfo: true,
      layout: 'columns',
      appearance: 'dark',
      showLogo: true,
      logoSize: 'md',
      mobileColumns: 'hidden',
      cta: { label: '', url: '' },
      bottomNote: '',
      showBackToTop: false,
    },
    home: { sections: defaultHomeSections() },
    contact: {
      enabled: true,
      title: 'Contáctanos',
      intro:
        '¿Tienes una pregunta o quieres un pedido personalizado? Escríbenos.',
      showForm: true,
      formButtonLabel: 'Enviar por WhatsApp',
      whatsappMessage: 'Hola, tengo una consulta',
      hours: '',
      mapEmbedUrl: '',
      faqTitle: 'Preguntas frecuentes',
      faqs: [],
    },
    pages: [],
    integrations: {
      googleAnalyticsId: '',
      metaPixelId: '',
      googleSiteVerification: '',
    },
  };
}

function defaultTiles(): CategoryTileConfig[] {
  const tile = (
    id: string,
    title: string,
    kicker: string,
    cta: string,
    fit: ProductFitKey,
    defaultImage: DefaultTileImage,
  ): CategoryTileConfig => ({
    id,
    enabled: true,
    title,
    kicker,
    cta,
    url: `/tienda?fit=${fit}`,
    imageUrl: '',
    mobileImageUrl: '',
    defaultImage,
  });
  return [
    tile(
      'women',
      'Mujer',
      'Lo nuevo en ella',
      'Descubre su estilo',
      'women',
      'bg_mujer',
    ),
    tile(
      'family',
      'Familiar',
      'Juntos, a juego',
      'Explora los looks',
      'family',
      'bg_familia',
    ),
    tile(
      'men',
      'Hombre',
      'Corte oversize',
      'Descubre su estilo',
      'men',
      'bg_hombre',
    ),
    tile(
      'unisex',
      'Unisex',
      'Básicos sin género',
      'Explora los esenciales',
      'unisex',
      'bg_hoodie',
    ),
    tile(
      'kids',
      'Kids',
      'Estilo en miniatura',
      'Descubre la línea Kids',
      'kids',
      'bg_kids',
    ),
  ];
}

function defaultHero(): HeroSection {
  return {
    id: 'hero',
    type: 'hero',
    enabled: true,
    kicker: '',
    titleLine: 'Miles de diseños para tu ropa,',
    titleAccent: 'o crea el tuyo',
    subtitle:
      'Explora nuestro catálogo o descríbenos lo que imaginas. Lo estampamos en la prenda que elijas.',
    searchPlaceholder: 'Quiero una camiseta minimalista…',
    suggestions: [
      'una camiseta minimalista',
      'un diseño de anime',
      'el logo de mi marca',
      'una ilustración a mi gusto',
      'un hoodie oversize negro',
      'lo que se me ocurra…',
    ],
    chips: [
      { label: 'Anime', url: '/tienda?q=anime' },
      { label: 'Minimalista', url: '/tienda?q=minimalista' },
      { label: 'Streetwear', url: '/tienda?q=streetwear' },
      { label: 'Tu logo', url: '/tienda?q=logo%20de%20marca' },
    ],
    imageUrl: '',
    mobileImageUrl: '',
    height: 'full',
    mobileHeight: 'full',
    align: 'center',
    vAlign: 'center',
    overlay: 0,
    textPanel: 'glass',
    textColor: 'light',
    imagePosition: 'center',
    zoom: true,
    showSearch: true,
    showScroll: true,
    primaryCta: { label: '', url: '' },
    secondaryCta: { label: '', url: '' },
  };
}

function defaultCategories(): CategoriesSection {
  return {
    id: 'categories',
    type: 'categories',
    enabled: true,
    tiles: defaultTiles(),
  };
}

function defaultHomeSections(): HomeSection[] {
  return [defaultHero(), defaultCategories()];
}

// ---------------------------------------------------------------------------
// Normalizadores por sección
// ---------------------------------------------------------------------------

function normAnnouncement(
  v: unknown,
  d: AnnouncementConfig,
): AnnouncementConfig {
  if (!isObj(v)) return d;
  return {
    enabled: bool(v.enabled, d.enabled),
    text: str(v.text, 160),
    linkLabel: str(v.linkLabel, 40),
    linkUrl: link(v.linkUrl),
    backgroundColor: color(v.backgroundColor, d.backgroundColor),
    textColor: color(v.textColor, d.textColor),
  };
}

const HEADER_LAYOUTS: readonly HeaderLayout[] = [
  'logo-center',
  'logo-left',
  'logo-left-menu-center',
  'logo-right',
  'stacked',
];

function normHeader(v: unknown, d: HeaderConfig): HeaderConfig {
  if (!isObj(v)) return d;
  return {
    navItems: Array.isArray(v.navItems)
      ? list(v.navItems, MAX_NAV_ITEMS, siteLink)
      : d.navItems,
    layout: oneOf(v.layout, HEADER_LAYOUTS, d.layout),
    appearance: oneOf(
      v.appearance,
      ['transparent', 'dark', 'light'] as const,
      d.appearance,
    ),
    logoSize: oneOf(v.logoSize, ['sm', 'md', 'lg'] as const, d.logoSize),
    menuCase: oneOf(v.menuCase, ['as-typed', 'uppercase'] as const, d.menuCase),
    sticky: bool(v.sticky, d.sticky),
    showSearch: bool(v.showSearch, d.showSearch),
    showFavorites: bool(v.showFavorites, d.showFavorites),
    showAccount: bool(v.showAccount, d.showAccount),
    mobileMenu: bool(v.mobileMenu, d.mobileMenu),
  };
}

function normFooter(v: unknown, d: FooterConfig): FooterConfig {
  if (!isObj(v)) return d;
  return {
    about: str(v.about, 300),
    columns: Array.isArray(v.columns)
      ? list(v.columns, MAX_FOOTER_COLUMNS, (c) => {
          if (!isObj(c)) return null;
          const title = str(c.title, 40);
          if (!title) return null;
          return {
            title,
            links: list(c.links, MAX_LINKS_PER_COLUMN, siteLink),
          };
        })
      : d.columns,
    legalLinks: Array.isArray(v.legalLinks)
      ? list(v.legalLinks, MAX_LEGAL_LINKS, siteLink)
      : d.legalLinks,
    copyright: str(v.copyright, 200),
    showSocial: bool(v.showSocial, d.showSocial),
    showContactInfo: bool(v.showContactInfo, d.showContactInfo),
    layout: oneOf(
      v.layout,
      ['columns', 'centered', 'compact'] as const,
      d.layout,
    ),
    appearance: oneOf(
      v.appearance,
      ['dark', 'light', 'brand'] as const,
      d.appearance,
    ),
    showLogo: bool(v.showLogo, d.showLogo),
    logoSize: oneOf(v.logoSize, ['sm', 'md', 'lg'] as const, d.logoSize),
    mobileColumns: oneOf(
      v.mobileColumns,
      ['hidden', 'accordion', 'visible'] as const,
      d.mobileColumns,
    ),
    cta: siteLink(v.cta) ?? { label: '', url: '' },
    bottomNote: str(v.bottomNote, 120),
    showBackToTop: bool(v.showBackToTop, d.showBackToTop),
  };
}

function normContact(v: unknown, d: ContactPageConfig): ContactPageConfig {
  if (!isObj(v)) return d;
  const map = str(v.mapEmbedUrl, 2048);
  return {
    enabled: bool(v.enabled, d.enabled),
    title: str(v.title, 80) || d.title,
    intro: str(v.intro, 500),
    showForm: bool(v.showForm, d.showForm),
    formButtonLabel: str(v.formButtonLabel, 40) || d.formButtonLabel,
    whatsappMessage: str(v.whatsappMessage, 200) || d.whatsappMessage,
    hours: str(v.hours, 400),
    // Solo se admite el iframe de inserción oficial de Google Maps.
    mapEmbedUrl: /^https:\/\/www\.google\.com\/maps\/embed\?[^\s"'<>]+$/.test(
      map,
    )
      ? map
      : '',
    faqTitle: str(v.faqTitle, 80) || d.faqTitle,
    faqs: Array.isArray(v.faqs)
      ? list(v.faqs, MAX_FAQS, (f) => {
          if (!isObj(f)) return null;
          const question = str(f.question, 160);
          const answer = str(f.answer, 1000);
          return question && answer ? { question, answer } : null;
        })
      : d.faqs,
  };
}

function normPages(v: unknown, d: SitePage[]): SitePage[] {
  if (!Array.isArray(v)) return d;
  const seen = new Set<string>();
  return list(v, MAX_PAGES, (p) => {
    if (!isObj(p)) return null;
    const s = slug(p.slug);
    const title = str(p.title, 100);
    if (!s || !title || seen.has(s)) return null;
    seen.add(s);
    return {
      slug: s,
      title,
      content:
        typeof p.content === 'string'
          ? p.content.slice(0, MAX_PAGE_CONTENT)
          : '',
      published: bool(p.published, true),
      inFooter: bool(p.inFooter, false),
    };
  });
}

function normIntegrations(
  v: unknown,
  d: IntegrationsConfig,
): IntegrationsConfig {
  if (!isObj(v)) return d;
  const ga = str(v.googleAnalyticsId, 30).toUpperCase();
  const pixel = str(v.metaPixelId, 30);
  const verif = str(v.googleSiteVerification, 100);
  return {
    googleAnalyticsId: /^G-[A-Z0-9]{4,20}$/.test(ga) ? ga : '',
    metaPixelId: /^\d{8,20}$/.test(pixel) ? pixel : '',
    googleSiteVerification: /^[A-Za-z0-9_-]{10,100}$/.test(verif) ? verif : '',
  };
}

function normTile(v: unknown, index: number): CategoryTileConfig | null {
  if (!isObj(v)) return null;
  const title = str(v.title, 40);
  if (!title) return null;
  return {
    id: slug(v.id, 40) || `categoria-${index + 1}`,
    enabled: bool(v.enabled, true),
    title,
    kicker: str(v.kicker, 60),
    cta: str(v.cta, 40) || 'Ver más',
    url: link(v.url) || '/tienda',
    imageUrl: imageUrl(v.imageUrl),
    mobileImageUrl: imageUrl(v.mobileImageUrl),
    defaultImage: oneOf(v.defaultImage, TILE_IMAGES, ''),
  };
}

function normSection(v: unknown, index: number): HomeSection | null {
  if (!isObj(v)) return null;
  const base = {
    id: slug(v.id, 40) || `seccion-${index + 1}`,
    enabled: bool(v.enabled, true),
  };
  switch (v.type) {
    case 'hero': {
      const d = defaultHero();
      return {
        ...base,
        type: 'hero',
        kicker: str(v.kicker, 60),
        titleLine: str(v.titleLine, 100) || d.titleLine,
        titleAccent: str(v.titleAccent, 60),
        subtitle: str(v.subtitle, 240),
        searchPlaceholder: str(v.searchPlaceholder, 80) || d.searchPlaceholder,
        suggestions: list(
          v.suggestions,
          MAX_SUGGESTIONS,
          (s) => str(s, 60) || null,
        ),
        chips: list(v.chips, MAX_CHIPS, siteLink),
        imageUrl: imageUrl(v.imageUrl),
        mobileImageUrl: imageUrl(v.mobileImageUrl),
        height: oneOf(v.height, HERO_HEIGHTS, d.height),
        mobileHeight: oneOf(v.mobileHeight, HERO_HEIGHTS, d.mobileHeight),
        align: oneOf(v.align, ['left', 'center', 'right'] as const, d.align),
        vAlign: oneOf(v.vAlign, ['top', 'center', 'bottom'] as const, d.vAlign),
        overlay: int(v.overlay, 0, 80, d.overlay),
        textPanel: oneOf(
          v.textPanel,
          ['glass', 'solid', 'none'] as const,
          d.textPanel,
        ),
        textColor: oneOf(v.textColor, ['light', 'dark'] as const, d.textColor),
        imagePosition: oneOf(
          v.imagePosition,
          ['center', 'top', 'bottom', 'left', 'right'] as const,
          d.imagePosition,
        ),
        zoom: bool(v.zoom, d.zoom),
        showSearch: bool(v.showSearch, d.showSearch),
        showScroll: bool(v.showScroll, d.showScroll),
        primaryCta: siteLink(v.primaryCta) ?? { label: '', url: '' },
        secondaryCta: siteLink(v.secondaryCta) ?? { label: '', url: '' },
      };
    }
    case 'categories':
      return {
        ...base,
        type: 'categories',
        tiles: list(v.tiles, MAX_TILES, normTile),
      };
    case 'featured': {
      const UUID =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      const uuid = (x: unknown) => {
        const id = str(x, 36).toLowerCase();
        return UUID.test(id) ? id : '';
      };
      const designIds = [
        ...new Set(list(v.designIds, MAX_FEATURED, (x) => uuid(x) || null)),
      ];
      const columns = int(v.columns, 3, 5, 4);
      return {
        ...base,
        type: 'featured',
        title: str(v.title, 80),
        subtitle: str(v.subtitle, 200),
        mode: oneOf(v.mode, ['auto', 'manual'] as const, 'auto'),
        // Los ajustes son administrables: se valida el formato de la clave.
        fit: /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(str(v.fit, 60))
          ? str(v.fit, 60)
          : '',
        category: str(v.category, 60),
        query: str(v.query, 80),
        productId: uuid(v.productId),
        sort: oneOf(
          v.sort,
          ['newest', 'oldest', 'price-asc', 'price-desc', 'random'] as const,
          'newest',
        ),
        designIds,
        limit: int(v.limit, 2, MAX_FEATURED, 8),
        columns: columns as 3 | 4 | 5,
        image: oneOf(v.image, ['1', '2', '3', 'random'] as const, '1'),
        randomExclude: int(v.randomExclude, 0, 3, 0) as 0 | 1 | 2 | 3,
        ctaLabel: str(v.ctaLabel, 40),
        ctaUrl: link(v.ctaUrl) || '/tienda',
      };
    }
    case 'banner':
      return {
        ...base,
        type: 'banner',
        title: str(v.title, 100),
        text: str(v.text, 300),
        imageUrl: imageUrl(v.imageUrl),
        mobileImageUrl: imageUrl(v.mobileImageUrl),
        buttonLabel: str(v.buttonLabel, 40),
        buttonUrl: link(v.buttonUrl),
        align: oneOf(v.align, ['left', 'center', 'right'] as const, 'left'),
      };
    case 'text':
      return {
        ...base,
        type: 'text',
        title: str(v.title, 100),
        body:
          typeof v.body === 'string' ? v.body.slice(0, MAX_PAGE_CONTENT) : '',
        align: oneOf(v.align, ['left', 'center'] as const, 'left'),
      };
    default:
      return null;
  }
}

function normHome(
  v: unknown,
  d: { sections: HomeSection[] },
): { sections: HomeSection[] } {
  if (!isObj(v) || !Array.isArray(v.sections)) return d;
  const seen = new Set<string>();
  const sections = list(v.sections, MAX_HOME_SECTIONS, normSection).map((s) => {
    // Los ids deben ser únicos (se usan como ancla y como clave).
    let id = s.id;
    let n = 2;
    while (seen.has(id)) id = `${s.id}-${n++}`;
    seen.add(id);
    return { ...s, id };
  });
  // El hero y las categorías son secciones fijas: si faltan, se reponen
  // desactivadas para no perder su configuración por defecto.
  if (!sections.some((s) => s.type === 'hero')) {
    sections.unshift({ ...defaultHero(), enabled: false });
  }
  if (!sections.some((s) => s.type === 'categories')) {
    sections.push({ ...defaultCategories(), enabled: false });
  }
  return { sections };
}

// ---------------------------------------------------------------------------
// API pública del módulo
// ---------------------------------------------------------------------------

/** Normaliza una sección concreta de la configuración. */
const NORMALIZERS: {
  [K in keyof SiteConfig]: (v: unknown, d: SiteConfig[K]) => SiteConfig[K];
} = {
  announcement: normAnnouncement,
  header: normHeader,
  footer: normFooter,
  home: normHome,
  contact: normContact,
  pages: normPages,
  integrations: normIntegrations,
};

/**
 * Devuelve la configuración completa: lo guardado (normalizado) sobre los
 * valores por defecto.
 */
export function resolveSiteConfig(stored: unknown): SiteConfig {
  const defaults = defaultSiteConfig();
  if (!isObj(stored)) return defaults;
  const out = { ...defaults } as Record<string, unknown>;
  for (const key of SITE_CONFIG_KEYS) {
    if (stored[key] !== undefined) {
      out[key] = (NORMALIZERS[key] as (v: unknown, d: unknown) => unknown)(
        stored[key],
        defaults[key],
      );
    }
  }
  return out as unknown as SiteConfig;
}

/**
 * Aplica un parche (una o varias secciones) sobre lo guardado. Cada sección
 * del parche reemplaza por completo a la anterior, ya normalizada. Las claves
 * desconocidas se ignoran.
 */
export function mergeSiteConfig(stored: unknown, patch: unknown): Json {
  const out: Json = isObj(stored) ? { ...stored } : {};
  if (!isObj(patch)) return out;
  const defaults = defaultSiteConfig();
  for (const key of SITE_CONFIG_KEYS) {
    if (patch[key] !== undefined) {
      out[key] = (NORMALIZERS[key] as (v: unknown, d: unknown) => unknown)(
        patch[key],
        defaults[key],
      );
    }
  }
  return out;
}

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

export interface HeaderConfig {
  navItems: SiteLink[];
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
}

export interface CategoriesSection extends HomeSectionBase {
  type: 'categories';
  tiles: CategoryTileConfig[];
}

export interface FeaturedSection extends HomeSectionBase {
  type: 'featured';
  title: string;
  subtitle: string;
  limit: number;
  fit: ProductFitKey | '';
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
const MAX_PAGES = 10;
const MAX_HOME_SECTIONS = 12;
const MAX_TILES = 8;
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

function normHeader(v: unknown, d: HeaderConfig): HeaderConfig {
  if (!isObj(v)) return d;
  return {
    navItems: Array.isArray(v.navItems)
      ? list(v.navItems, MAX_NAV_ITEMS, siteLink)
      : d.navItems,
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
      };
    }
    case 'categories':
      return {
        ...base,
        type: 'categories',
        tiles: list(v.tiles, MAX_TILES, normTile),
      };
    case 'featured':
      return {
        ...base,
        type: 'featured',
        title: str(v.title, 80),
        subtitle: str(v.subtitle, 200),
        limit: int(v.limit, 2, 12, 8),
        fit: oneOf(v.fit, ['', ...FITS] as const, ''),
        ctaLabel: str(v.ctaLabel, 40),
        ctaUrl: link(v.ctaUrl) || '/tienda',
      };
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

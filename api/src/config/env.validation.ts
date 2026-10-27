/**
 * Validación de variables de entorno.
 * Se ejecuta al arrancar la aplicación; si falta alguna variable
 * requerida o tiene un formato inválido, el arranque falla temprano.
 */
export interface EnvVars {
  NODE_ENV: string;
  PORT: number;
  CORS_ORIGIN?: string;
  DB_HOST: string;
  DB_PORT: number;
  DB_USERNAME: string;
  DB_PASSWORD: string;
  DB_NAME: string;
  DB_SYNCHRONIZE: boolean;
  DB_LOGGING: boolean;
  DB_SSL: boolean;
  REDIS_HOST?: string;
  REDIS_PORT?: number;
  REDIS_USERNAME?: string;
  REDIS_PASSWORD?: string;
  JWT_SECRET: string;
  JWT_EXPIRES_IN: string;
  ADMIN_EMAIL: string;
  ADMIN_PASSWORD: string;
  SUDOMOCK_API_KEY: string;
  SUDOMOCK_ACCOUNTS?: string;
  SUDOMOCK_BASE_URL?: string;
  CLOUDINARY_CLOUD_NAME: string;
  CLOUDINARY_API_KEY: string;
  CLOUDINARY_API_SECRET: string;
  CLOUDINARY_FOLDER: string;
  OPENROUTER_API_KEY?: string;
  OPENROUTER_TEXT_MODEL?: string;
  OPENROUTER_EMBEDDING_MODEL?: string;
  BRAND_NAME?: string;
  SITE_URL?: string;
  CLIENT_DIST_PATH?: string;
}

export function validateEnv(config: Record<string, unknown>): EnvVars {
  const required = [
    'DB_HOST',
    'DB_PORT',
    'DB_USERNAME',
    'DB_PASSWORD',
    'DB_NAME',
    'JWT_SECRET',
    'SUDOMOCK_API_KEY',
    'CLOUDINARY_CLOUD_NAME',
    'CLOUDINARY_API_KEY',
    'CLOUDINARY_API_SECRET',
  ];

  for (const key of required) {
    if (config[key] === undefined || config[key] === '') {
      throw new Error(`La variable de entorno "${key}" es requerida`);
    }
  }

  const toBool = (value: unknown, fallback: boolean): boolean => {
    if (value === undefined) return fallback;
    return String(value).toLowerCase() === 'true';
  };

  const toNumber = (value: unknown, fallback: number, key: string): number => {
    if (value === undefined || value === '') return fallback;
    const parsed = Number(value);
    if (Number.isNaN(parsed)) {
      throw new Error(`La variable de entorno "${key}" debe ser numérica`);
    }
    return parsed;
  };

  return {
    NODE_ENV: String(config.NODE_ENV ?? 'development'),
    PORT: toNumber(config.PORT, 3000, 'PORT'),
    CORS_ORIGIN:
      config.CORS_ORIGIN === undefined
        ? undefined
        : String(config.CORS_ORIGIN),
    DB_HOST: String(config.DB_HOST),
    DB_PORT: toNumber(config.DB_PORT, 5432, 'DB_PORT'),
    DB_USERNAME: String(config.DB_USERNAME),
    DB_PASSWORD: String(config.DB_PASSWORD),
    DB_NAME: String(config.DB_NAME),
    DB_SYNCHRONIZE: toBool(config.DB_SYNCHRONIZE, false),
    DB_LOGGING: toBool(config.DB_LOGGING, false),
    DB_SSL: toBool(config.DB_SSL, false),
    REDIS_HOST:
      config.REDIS_HOST === undefined ? undefined : String(config.REDIS_HOST),
    REDIS_PORT:
      config.REDIS_PORT === undefined
        ? undefined
        : toNumber(config.REDIS_PORT, 6379, 'REDIS_PORT'),
    REDIS_USERNAME:
      config.REDIS_USERNAME === undefined
        ? undefined
        : String(config.REDIS_USERNAME),
    REDIS_PASSWORD:
      config.REDIS_PASSWORD === undefined
        ? undefined
        : String(config.REDIS_PASSWORD),
    JWT_SECRET: String(config.JWT_SECRET),
    JWT_EXPIRES_IN: String(config.JWT_EXPIRES_IN ?? '1h'),
    ADMIN_EMAIL: String(config.ADMIN_EMAIL ?? 'admin@kult.local'),
    ADMIN_PASSWORD: String(config.ADMIN_PASSWORD ?? 'changeme123'),
    SUDOMOCK_API_KEY: String(config.SUDOMOCK_API_KEY),
    SUDOMOCK_ACCOUNTS:
      config.SUDOMOCK_ACCOUNTS === undefined
        ? undefined
        : String(config.SUDOMOCK_ACCOUNTS),
    SUDOMOCK_BASE_URL:
      config.SUDOMOCK_BASE_URL === undefined
        ? undefined
        : String(config.SUDOMOCK_BASE_URL),
    CLOUDINARY_CLOUD_NAME: String(config.CLOUDINARY_CLOUD_NAME),
    CLOUDINARY_API_KEY: String(config.CLOUDINARY_API_KEY),
    CLOUDINARY_API_SECRET: String(config.CLOUDINARY_API_SECRET),
    CLOUDINARY_FOLDER: String(config.CLOUDINARY_FOLDER ?? 'kult/renders'),
    OPENROUTER_API_KEY:
      config.OPENROUTER_API_KEY === undefined
        ? undefined
        : String(config.OPENROUTER_API_KEY),
    OPENROUTER_TEXT_MODEL:
      config.OPENROUTER_TEXT_MODEL === undefined
        ? undefined
        : String(config.OPENROUTER_TEXT_MODEL),
    OPENROUTER_EMBEDDING_MODEL:
      config.OPENROUTER_EMBEDDING_MODEL === undefined
        ? undefined
        : String(config.OPENROUTER_EMBEDDING_MODEL),
    BRAND_NAME:
      config.BRAND_NAME === undefined ? undefined : String(config.BRAND_NAME),
    SITE_URL:
      config.SITE_URL === undefined ? undefined : String(config.SITE_URL),
    CLIENT_DIST_PATH:
      config.CLIENT_DIST_PATH === undefined
        ? undefined
        : String(config.CLIENT_DIST_PATH),
  };
}

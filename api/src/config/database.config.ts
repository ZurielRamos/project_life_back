import { registerAs } from '@nestjs/config';

/**
 * Configuración de la base de datos tomada de las variables de entorno.
 * Accesible vía ConfigService con el namespace "database".
 */
export default registerAs('database', () => ({
  type: 'postgres' as const,
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT ?? '5432', 10),
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  synchronize: process.env.DB_SYNCHRONIZE === 'true',
  logging: process.env.DB_LOGGING === 'true',
  ssl: process.env.DB_SSL === 'true',
}));

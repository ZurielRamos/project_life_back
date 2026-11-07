type OriginCallback = (err: Error | null, allow?: boolean) => void;

/**
 * Construye la función `origin` de CORS.
 *
 * Permite:
 * - los orígenes exactos de `allowedOrigins` (CORS_ORIGIN);
 * - cualquier subdominio de un nivel del dominio base de las tiendas
 *   (`https://<tienda>.<baseDomain>`), porque cada tienda tiene el suyo y no
 *   se pueden enumerar de antemano;
 * - peticiones sin cabecera Origin (curl, server-side), que CORS no restringe.
 *
 * En producción solo se acepta https para los subdominios; con el dominio base
 * `localhost` (desarrollo) se admite también http y puerto.
 */
export function buildCorsOrigin(
  allowedOrigins: string[],
  baseDomain?: string,
): (origin: string | undefined, callback: OriginCallback) => void {
  const base = baseDomain?.trim().toLowerCase();
  let storePattern: RegExp | null = null;

  if (base) {
    const escaped = base.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const isLocal = base === 'localhost';
    storePattern = new RegExp(
      `^${isLocal ? 'https?' : 'https'}://[a-z0-9]+(?:-[a-z0-9]+)*\\.${escaped}${
        isLocal ? '(?::\\d+)?' : ''
      }$`,
    );
  }

  return (origin, callback) => {
    if (!origin) {
      callback(null, true);
      return;
    }
    const allowed =
      allowedOrigins.includes(origin) ||
      (storePattern !== null && storePattern.test(origin.toLowerCase()));
    callback(null, allowed);
  };
}

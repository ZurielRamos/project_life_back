import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';

/**
 * Protección contra SSRF: antes de conectar a un servidor indicado por un
 * usuario (SMTP, API de WhatsApp) se comprueba que su dirección sea pública.
 * Se rechazan loopback, redes privadas, link-local (incluye el metadata de
 * la nube 169.254.169.254), CGNAT, multicast y direcciones sin especificar.
 *
 * Limitación conocida: se valida al resolver el nombre; un DNS malicioso con
 * TTL cero podría cambiar la respuesta entre la validación y la conexión.
 */

function ipv4IsPrivate(ip: string): boolean {
  const [a, b] = ip.split('.').map(Number);
  return (
    a === 0 || // 0.0.0.0/8
    a === 10 || // 10.0.0.0/8
    a === 127 || // loopback
    (a === 100 && b >= 64 && b <= 127) || // CGNAT 100.64.0.0/10
    (a === 169 && b === 254) || // link-local
    (a === 172 && b >= 16 && b <= 31) || // 172.16.0.0/12
    (a === 192 && b === 168) || // 192.168.0.0/16
    (a === 192 && b === 0) || // 192.0.0.0/24 y 192.0.2.0/24
    (a === 198 && (b === 18 || b === 19)) || // benchmarking
    a >= 224 // multicast y reservadas
  );
}

function ipv6IsPrivate(ip: string): boolean {
  const lower = ip.toLowerCase();
  if (lower === '::' || lower === '::1') return true;
  // IPv4 mapeada (::ffff:a.b.c.d)
  const mapped = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/.exec(lower);
  if (mapped) return ipv4IsPrivate(mapped[1]);
  return (
    /^f[cd]/.test(lower) || // ULA fc00::/7
    /^fe[89ab]/.test(lower) || // link-local fe80::/10
    lower.startsWith('ff') // multicast
  );
}

export function isPrivateAddress(ip: string): boolean {
  const family = isIP(ip);
  if (family === 4) return ipv4IsPrivate(ip);
  if (family === 6) return ipv6IsPrivate(ip);
  return true; // si no es una IP válida, se trata como no segura
}

/** Lanza un Error si el host resuelve a una dirección no pública. */
export async function assertPublicHost(
  hostname: string,
  allowPrivate = false,
): Promise<void> {
  if (allowPrivate) return;
  const host = hostname.replace(/^\[|\]$/g, '');
  const addresses = isIP(host)
    ? [host]
    : (await lookup(host, { all: true })).map((a) => a.address);
  if (addresses.length === 0 || addresses.some(isPrivateAddress)) {
    throw new Error(
      'El servidor indicado no es público. Usa un host accesible desde internet.',
    );
  }
}

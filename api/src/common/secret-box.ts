import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from 'node:crypto';

/**
 * Cifrado de secretos en reposo (contraseñas SMTP, tokens de API…) con
 * AES-256-GCM. El formato guardado es `v1:<iv>:<tag>:<texto cifrado>`, todo
 * en base64. GCM autentica el contenido: si alguien altera el valor guardado,
 * el descifrado falla en vez de devolver basura.
 */

const VERSION = 'v1';

/** Deriva una clave de 32 bytes a partir del secreto configurado. */
export function deriveKey(secret: string): Buffer {
  return createHash('sha256')
    .update(`store-notifications:${VERSION}:${secret}`)
    .digest();
}

export function encryptSecret(plain: string, key: Buffer): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([
    cipher.update(plain, 'utf8'),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return [
    VERSION,
    iv.toString('base64'),
    tag.toString('base64'),
    encrypted.toString('base64'),
  ].join(':');
}

/** Descifra un valor guardado. Devuelve null si no es válido o fue alterado. */
export function decryptSecret(stored: string, key: Buffer): string | null {
  const parts = stored.split(':');
  if (parts.length !== 4 || parts[0] !== VERSION) return null;
  try {
    const decipher = createDecipheriv(
      'aes-256-gcm',
      key,
      Buffer.from(parts[1], 'base64'),
    );
    decipher.setAuthTag(Buffer.from(parts[2], 'base64'));
    return Buffer.concat([
      decipher.update(Buffer.from(parts[3], 'base64')),
      decipher.final(),
    ]).toString('utf8');
  } catch {
    return null;
  }
}

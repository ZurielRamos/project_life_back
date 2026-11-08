/**
 * Envío de la plantilla de autenticación de WhatsApp (API de Strategee).
 * Lo comparten el código de verificación de clientes y la prueba de envío
 * del panel de notificaciones.
 */

export interface WhatsappAuthConfig {
  /** URL completa del endpoint auth-template. */
  endpoint: string;
  apiToken: string;
  /** Canal (inbox) desde el que se envía. */
  inboxId: string;
  templateName: string;
  languageCode: string;
}

/** Error al entregar el mensaje; `status` es el HTTP del proveedor, si lo hubo. */
export class WhatsappDeliveryError extends Error {
  constructor(
    message: string,
    readonly status?: number,
    readonly detail?: string,
  ) {
    super(message);
    this.name = 'WhatsappDeliveryError';
  }
}

/** Arma el endpoint: <url base>/api/v1/<cuenta>/whatsapp/auth-template */
export function buildWhatsappEndpoint(
  apiUrl: string,
  accountSlug: string,
): string {
  return `${apiUrl.replace(/\/+$/, '')}/api/v1/${accountSlug}/whatsapp/auth-template`;
}

export async function sendWhatsappAuthTemplate(
  cfg: WhatsappAuthConfig,
  to: string,
  code: string,
  timeoutMs = 15_000,
): Promise<void> {
  let res: Response;
  try {
    res = await fetch(cfg.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-token': cfg.apiToken,
      },
      body: JSON.stringify({
        inboxId: cfg.inboxId,
        to,
        templateName: cfg.templateName,
        languageCode: cfg.languageCode,
        code,
      }),
      signal: AbortSignal.timeout(timeoutMs),
      // No se siguen redirecciones: podrían llevar a un host no validado.
      redirect: 'error',
    });
  } catch (err) {
    throw new WhatsappDeliveryError(
      'No se pudo conectar con la API de WhatsApp',
      undefined,
      err instanceof Error ? err.message : String(err),
    );
  }
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new WhatsappDeliveryError(
      `La API de WhatsApp respondió ${res.status}`,
      res.status,
      text.slice(0, 500),
    );
  }
}

import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

const OPENROUTER_BASE = 'https://openrouter.ai/api/v1';

/** Contexto para generar el SEO de un diseño. */
export interface SeoGenerationInput {
  productName: string;
  productCategory?: string | null;
  productDescription?: string | null;
  /** URL de una imagen del render para que el modelo "vea" el diseño. */
  imageUrl?: string | null;
  /**
   * Referencias del usuario para guiar la generación (p. ej. personajes,
   * temática, estilo) cuando la imagen no basta.
   */
  hints?: string | null;
}

/** SEO generado por la IA (todo en español). */
export interface GeneratedSeo {
  title: string;
  slug: string;
  metaTitle: string;
  metaDescription: string;
  description: string;
  keywords: string[];
}

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);

  constructor(private readonly configService: ConfigService) {}

  private get apiKey(): string {
    const key = this.configService.get<string>('OPENROUTER_API_KEY');
    if (!key) {
      throw new InternalServerErrorException(
        'OPENROUTER_API_KEY no está configurada',
      );
    }
    return key;
  }

  /**
   * Genera título, descripción y metadatos SEO en español a partir del
   * producto y una imagen del render. Devuelve JSON estructurado.
   */
  async generateSeo(input: SeoGenerationInput): Promise<GeneratedSeo> {
    const model =
      this.configService.get<string>('OPENROUTER_TEXT_MODEL') ??
      'google/gemini-2.5-flash';

    const system =
      'Eres un experto en e-commerce y SEO para una tienda de ropa. ' +
      'Generas contenido SIEMPRE en español, optimizado para buscadores ' +
      'y motores de IA. Respondes ÚNICAMENTE con un objeto JSON válido, ' +
      'sin texto adicional ni markdown.';

    const instructions = [
      'A partir del producto y la imagen del diseño, genera un JSON con:',
      '- "title": título comercial atractivo (máx 70 caracteres).',
      '- "slug": slug en minúsculas, sin acentos, separado por guiones.',
      '- "metaTitle": meta title SEO (máx 60 caracteres).',
      '- "metaDescription": meta description SEO (máx 160 caracteres).',
      '- "description": descripción larga enfocada en SEO (2-4 frases), ' +
        'que describa el diseño y el producto de forma persuasiva.',
      '- "keywords": arreglo de 5 a 10 palabras clave relevantes.',
      'Todo el texto en español. Responde solo el JSON.',
      '',
      `Producto: ${input.productName}`,
      input.productCategory ? `Categoría: ${input.productCategory}` : '',
      input.productDescription
        ? `Descripción del producto: ${input.productDescription}`
        : '',
      input.hints
        ? `\nReferencias del usuario sobre el diseño (tenlas MUY en cuenta, ` +
          `priorízalas sobre lo que infieras de la imagen): ${input.hints}`
        : '',
    ]
      .filter(Boolean)
      .join('\n');

    // Contenido del mensaje: texto + imagen (si hay) para visión.
    const userContent: unknown[] = [{ type: 'text', text: instructions }];
    if (input.imageUrl) {
      userContent.push({
        type: 'image_url',
        image_url: { url: input.imageUrl },
      });
    }

    const body = {
      model,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: userContent },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.7,
    };

    const raw = await this.chatCompletion(body);
    const parsed = this.parseJson(raw);

    return {
      title: String(parsed.title ?? input.productName).slice(0, 120),
      slug: this.normalizeSlug(
        String(parsed.slug ?? parsed.title ?? input.productName),
      ),
      metaTitle: String(parsed.metaTitle ?? parsed.title ?? '').slice(0, 70),
      metaDescription: String(parsed.metaDescription ?? '').slice(0, 200),
      description: String(parsed.description ?? ''),
      keywords: Array.isArray(parsed.keywords)
        ? parsed.keywords.map((k: unknown) => String(k)).slice(0, 15)
        : [],
    };
  }

  /** Genera el embedding (1536 dims) de un texto. */
  async embed(text: string): Promise<number[]> {
    const model =
      this.configService.get<string>('OPENROUTER_EMBEDDING_MODEL') ??
      'openai/text-embedding-3-small';

    const response = await fetch(`${OPENROUTER_BASE}/embeddings`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ model, input: text }),
    });

    if (!response.ok) {
      const detail = await response.text();
      this.logger.error(`Error de embeddings OpenRouter: ${detail}`);
      throw new InternalServerErrorException(
        'No se pudo generar el embedding',
      );
    }

    const data = (await response.json()) as {
      data?: { embedding?: number[] }[];
    };
    const embedding = data.data?.[0]?.embedding;
    if (!embedding || embedding.length === 0) {
      throw new InternalServerErrorException(
        'La respuesta de embeddings vino vacía',
      );
    }
    return embedding;
  }

  /** Llama al chat completion de OpenRouter y devuelve el texto del mensaje. */
  private async chatCompletion(body: unknown): Promise<string> {
    const response = await fetch(`${OPENROUTER_BASE}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const detail = await response.text();
      this.logger.error(`Error de OpenRouter: ${detail}`);
      throw new InternalServerErrorException(
        'No se pudo generar el contenido con IA',
      );
    }

    const data = (await response.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    return data.choices?.[0]?.message?.content ?? '';
  }

  /** Parsea JSON tolerando que venga envuelto en ```json ... ```. */
  private parseJson(raw: string): Record<string, unknown> {
    const cleaned = raw
      .trim()
      .replace(/^```(?:json)?/i, '')
      .replace(/```$/, '')
      .trim();
    try {
      return JSON.parse(cleaned) as Record<string, unknown>;
    } catch {
      this.logger.warn(`No se pudo parsear el JSON de la IA: ${raw}`);
      return {};
    }
  }

  /** Normaliza un slug: minúsculas, sin acentos, guiones. */
  private normalizeSlug(value: string): string {
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 120);
  }
}

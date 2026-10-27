import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary, type UploadApiResponse } from 'cloudinary';

export interface UploadedImage {
  /** URL https servible de la imagen. */
  url: string;
  /** Identificador en Cloudinary (útil para borrar/transformar luego). */
  publicId: string;
  width: number;
  height: number;
  format: string;
  bytes: number;
}

/**
 * Envoltura del SDK de Cloudinary.
 *
 * Caso de uso actual: subir a Cloudinary una imagen a partir de una URL
 * (p. ej. la URL de un render de SudoMock en su CDN). Cloudinary descarga
 * la imagen desde esa URL, por lo que no manejamos binarios aquí.
 */
@Injectable()
export class CloudinaryService implements OnModuleInit {
  private readonly logger = new Logger(CloudinaryService.name);
  private defaultFolder: string;

  constructor(private readonly configService: ConfigService) {}

  onModuleInit(): void {
    cloudinary.config({
      cloud_name: this.configService.get<string>('CLOUDINARY_CLOUD_NAME'),
      api_key: this.configService.get<string>('CLOUDINARY_API_KEY'),
      api_secret: this.configService.get<string>('CLOUDINARY_API_SECRET'),
      secure: true,
    });
    this.defaultFolder =
      this.configService.get<string>('CLOUDINARY_FOLDER') ?? 'kult/renders';
    this.logger.log('Cliente Cloudinary inicializado.');
  }

  /**
   * Sube una imagen a Cloudinary a partir de su URL de origen.
   *
   * @param sourceUrl URL pública de la imagen (p. ej. render de SudoMock).
   * @param options.folder   carpeta destino (default: CLOUDINARY_FOLDER).
   * @param options.publicId nombre fijo del asset (opcional).
   */
  async uploadFromUrl(
    sourceUrl: string,
    options: { folder?: string; publicId?: string } = {},
  ): Promise<UploadedImage> {
    const response: UploadApiResponse = await cloudinary.uploader.upload(
      sourceUrl,
      {
        folder: options.folder ?? this.defaultFolder,
        public_id: options.publicId,
        resource_type: 'image',
        overwrite: true,
      },
    );

    return {
      url: response.secure_url,
      publicId: response.public_id,
      width: response.width,
      height: response.height,
      format: response.format,
      bytes: response.bytes,
    };
  }

  /**
   * Sube una imagen a partir de datos directos: un data URI
   * (data:image/png;base64,...) o una cadena base64. Útil para subir
   * archivos que el usuario carga desde el navegador.
   */
  async uploadImageData(
    data: string,
    options: { folder?: string; publicId?: string } = {},
  ): Promise<UploadedImage> {
    const response: UploadApiResponse = await cloudinary.uploader.upload(data, {
      folder: options.folder ?? this.defaultFolder,
      public_id: options.publicId,
      resource_type: 'image',
      overwrite: true,
    });

    return {
      url: response.secure_url,
      publicId: response.public_id,
      width: response.width,
      height: response.height,
      format: response.format,
      bytes: response.bytes,
    };
  }

  /** Elimina un asset de Cloudinary por su publicId. */
  async deleteByPublicId(publicId: string): Promise<void> {
    await cloudinary.uploader.destroy(publicId, { resource_type: 'image' });
  }
}

import { IsString, Matches } from 'class-validator';

/**
 * Sube una imagen de diseño a Cloudinary. `dataUri` es un data URI
 * (data:image/png;base64,....) generado en el navegador al cargar el
 * archivo.
 */
export class UploadImageDto {
  @IsString()
  @Matches(/^data:image\/[a-zA-Z0-9.+-]+;base64,/, {
    message: 'dataUri debe ser un data URI de imagen en base64',
  })
  dataUri: string;
}

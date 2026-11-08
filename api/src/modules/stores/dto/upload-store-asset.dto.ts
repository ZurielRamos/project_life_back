import { IsString, Matches, MaxLength } from 'class-validator';

/** Imagen del sitio (logo, banner, etc.) como data URI en base64. */
export class UploadStoreAssetDto {
  @IsString()
  @Matches(
    /^data:image\/(png|jpe?g|webp|gif|avif|svg\+xml|x-icon|vnd\.microsoft\.icon);base64,/,
    {
      message:
        'La imagen debe ser PNG, JPG, WEBP, GIF, AVIF, SVG o ICO en base64',
    },
  )
  // ~8 MB de imagen en base64.
  @MaxLength(11_500_000, { message: 'La imagen supera los 8 MB' })
  dataUri: string;
}

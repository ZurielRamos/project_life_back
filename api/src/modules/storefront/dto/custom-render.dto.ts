import { Type } from 'class-transformer';
import {
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Min,
  ValidateNested,
} from 'class-validator';

/** Colocación de la imagen del usuario, en px del smart object "dise". */
export class CustomPlacementDto {
  @IsNumber()
  xPx: number;

  @IsNumber()
  yPx: number;

  @IsNumber()
  @Min(1)
  widthPx: number;

  @IsNumber()
  @Min(1)
  heightPx: number;

  @IsOptional()
  @IsNumber()
  rotation?: number;
}

/** Sube la imagen del usuario (data URI base64) para personalizar. */
export class CustomUploadDto {
  @IsString()
  @Matches(/^data:image\/[a-zA-Z0-9.+-]+;base64,/, {
    message: 'dataUri debe ser un data URI de imagen en base64',
  })
  dataUri: string;
}

/**
 * Renderiza la imagen del usuario en todos los mockups de la sesión indicada
 * del producto, con el color elegido. Efímero (no persiste nada).
 */
export class CustomRenderSessionDto {
  @IsUUID('4')
  productId: string;

  @IsUUID('4')
  sessionId: string;

  /** URL (Cloudinary) de la imagen subida del usuario. */
  @IsString()
  imageUrl: string;

  /** uuid del smart object "dise" sobre el que se coloca. */
  @IsString()
  designSmartObjectUuid: string;

  @ValidateNested()
  @Type(() => CustomPlacementDto)
  placement: CustomPlacementDto;

  /** Color (id del producto) a renderizar. Sin color si se omite. */
  @IsOptional()
  @IsUUID('4')
  colorId?: string;

  /**
   * Hex del color a aplicar al smart object "color" (p.ej. "#000000"). Se
   * usa directamente para tintar; es más robusto que `colorId` porque los
   * colores del storefront provienen de los renders del diseño y pueden no
   * coincidir con `product.colors`.
   */
  @IsOptional()
  @IsString()
  @Matches(/^#?[0-9a-fA-F]{6}$/, { message: 'colorHex debe ser un hex de 6 dígitos' })
  colorHex?: string;
}

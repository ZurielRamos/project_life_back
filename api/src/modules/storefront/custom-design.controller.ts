import {
  Body,
  Controller,
  ForbiddenException,
  Post,
  UseGuards,
} from '@nestjs/common';
import { Public } from '../auth/decorators/public.decorator';
import { CurrentCustomer } from '../customers/decorators/current-customer.decorator';
import { CustomerJwtGuard } from '../customers/guards/customer-jwt.guard';
import { CustomersService } from '../customers/customers.service';
import { AuthenticatedCustomer } from '../customers/interfaces/customer-jwt.interface';
import { DesignsService } from '../designs/designs.service';
import { SettingsService } from '../settings/settings.service';
import type { UploadedImage } from '../cloudinary/cloudinary.service';
import {
  CustomRenderSessionDto,
  CustomUploadDto,
} from './dto/custom-render.dto';

/**
 * API "crea tu propia camiseta". El preview de la primera imagen es público;
 * ver la sesión completa (todos los mockups del color) exige una sesión de
 * cliente y respeta el tope por hora configurable.
 */
@Controller('custom')
export class CustomDesignController {
  constructor(
    private readonly designsService: DesignsService,
    private readonly customersService: CustomersService,
    private readonly settingsService: SettingsService,
  ) {}

  /** Sube la imagen del usuario y devuelve su URL en Cloudinary. Público. */
  @Public()
  @Post('upload')
  upload(@Body() dto: CustomUploadDto): Promise<UploadedImage> {
    return this.designsService.uploadUserImage(dto.dataUri);
  }

  /**
   * Preview GRATIS (sin registro): renderiza SOLO la primera imagen de la
   * sesión. Devuelve además el total de mockups para que el front muestre el
   * resto borroso con el gate de registro.
   */
  @Public()
  @Post('preview')
  async preview(
    @Body() dto: CustomRenderSessionDto,
  ): Promise<{ images: string[]; totalMockups: number }> {
    return this.designsService.renderCustomSession({
      productId: dto.productId,
      sessionId: dto.sessionId,
      imageUrl: dto.imageUrl,
      designSmartObjectUuid: dto.designSmartObjectUuid,
      placement: dto.placement,
      colorId: dto.colorId,
      colorHex: dto.colorHex,
      maxMockups: 1,
    });
  }

  /**
   * Sesión COMPLETA (requiere sesión de cliente): renderiza todos los
   * mockups del color. Aplica el tope por hora configurable.
   */
  @Public()
  @UseGuards(CustomerJwtGuard)
  @Post('render-session')
  async renderSession(
    @Body() dto: CustomRenderSessionDto,
    @CurrentCustomer() customer: AuthenticatedCustomer,
  ): Promise<{ images: string[]; totalMockups: number }> {
    // Tope por hora (0 = sin límite).
    const settings = await this.settingsService.getGenerationSettings();
    const max = settings.maxColorGenerationsPerHour;
    if (max > 0) {
      const used = await this.customersService.countGenerationsLastHour(
        customer.id,
      );
      if (used >= max) {
        throw new ForbiddenException(
          `Alcanzaste el máximo de ${max} generaciones por hora. Intenta más tarde.`,
        );
      }
    }

    const result = await this.designsService.renderCustomSession({
      productId: dto.productId,
      sessionId: dto.sessionId,
      imageUrl: dto.imageUrl,
      designSmartObjectUuid: dto.designSmartObjectUuid,
      placement: dto.placement,
      colorId: dto.colorId,
      colorHex: dto.colorHex,
    });

    await this.customersService.recordGeneration(
      customer.id,
      dto.productId,
      dto.colorId ?? null,
    );

    return result;
  }
}

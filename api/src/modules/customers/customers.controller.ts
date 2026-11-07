import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { Public } from '../auth/decorators/public.decorator';
import {
  CustomerAuthResult,
  CustomerAuthService,
  OtpRequestedResult,
  VerifyOtpResult,
} from './customer-auth.service';
import { CustomersService } from './customers.service';
import { CustomerView, toCustomerView } from './customers.presenter';
import { CurrentCustomer } from './decorators/current-customer.decorator';
import { RegisterCustomerDto } from './dto/register-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { RequestOtpDto, VerifyOtpDto } from './dto/verify-otp.dto';
import { CustomerJwtGuard } from './guards/customer-jwt.guard';
import { AuthenticatedCustomer } from './interfaces/customer-jwt.interface';

/**
 * API pública de clientes (storefront). Marcada @Public() para que el guard
 * global de administración no intente validar estas rutas con la estrategia
 * `jwt`. La sesión de cliente se valida con CustomerJwtGuard donde aplica.
 */
@Public()
@Controller('customers')
export class CustomersController {
  constructor(
    private readonly customerAuthService: CustomerAuthService,
    private readonly customersService: CustomersService,
  ) {}

  /**
   * Acceso, paso 1: envía un OTP por WhatsApp al número (tenga cuenta o no).
   */
  @HttpCode(HttpStatus.OK)
  @Post('auth/request-otp')
  requestOtp(@Body() dto: RequestOtpDto): Promise<OtpRequestedResult> {
    return this.customerAuthService.requestOtp(dto);
  }

  /**
   * Acceso, paso 2: verifica el OTP. Si el cliente existe devuelve la sesión
   * (`status: 'authenticated'`); si es nuevo, un `registrationToken`
   * (`status: 'registration_required'`) para completar sus datos.
   */
  @HttpCode(HttpStatus.OK)
  @Post('auth/verify-otp')
  verifyOtp(@Body() dto: VerifyOtpDto): Promise<VerifyOtpResult> {
    return this.customerAuthService.verifyOtp(dto);
  }

  /**
   * Acceso, paso 3 (solo clientes nuevos): crea la cuenta con los datos
   * capturados y devuelve la sesión.
   */
  @Post('register')
  register(@Body() dto: RegisterCustomerDto): Promise<CustomerAuthResult> {
    return this.customerAuthService.register(dto);
  }

  /** Perfil completo del cliente autenticado. */
  @UseGuards(CustomerJwtGuard)
  @Get('me')
  async me(
    @CurrentCustomer() customer: AuthenticatedCustomer,
  ): Promise<CustomerView> {
    const full = await this.customersService.findOne(customer.id);
    return toCustomerView(full);
  }

  /** Actualiza el perfil del cliente (nombre, email, género, ciudad, intereses). */
  @UseGuards(CustomerJwtGuard)
  @Patch('me')
  async updateMe(
    @CurrentCustomer() customer: AuthenticatedCustomer,
    @Body() dto: UpdateCustomerDto,
  ): Promise<CustomerView> {
    const updated = await this.customersService.updateProfile(customer.id, dto);
    return toCustomerView(updated);
  }

  /** Actualiza la preferencia de marketing (configuración). */
  @UseGuards(CustomerJwtGuard)
  @Patch('me/marketing')
  async updateMarketing(
    @CurrentCustomer() customer: AuthenticatedCustomer,
    @Body() body: { marketingOptIn: boolean },
  ): Promise<CustomerView> {
    const updated = await this.customersService.setMarketingOptIn(
      customer.id,
      !!body.marketingOptIn,
    );
    return toCustomerView(updated);
  }
}

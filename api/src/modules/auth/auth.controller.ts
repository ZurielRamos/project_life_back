import { Body, Controller, Get, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { AuthResult, AuthService } from './auth.service';
import { CurrentUser } from './decorators/current-user.decorator';
import { Public } from './decorators/public.decorator';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { AuthenticatedUser } from './interfaces/authenticated-user.interface';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('register')
  register(@Body() dto: RegisterDto): Promise<AuthResult> {
    return this.authService.register(dto);
  }

  @Public()
  @HttpCode(HttpStatus.OK)
  @Post('login')
  login(@Body() dto: LoginDto): Promise<AuthResult> {
    return this.authService.login(dto);
  }

  /**
   * Devuelve el usuario autenticado con sus roles y permisos resueltos.
   * Útil para que el frontend sepa qué puede renderizar.
   */
  @Get('me')
  me(@CurrentUser() user: AuthenticatedUser): AuthenticatedUser {
    return user;
  }
}

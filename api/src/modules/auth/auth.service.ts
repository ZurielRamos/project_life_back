import {
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { toUserView, UserView } from '../users/users.presenter';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { JwtPayload } from './interfaces/jwt-payload.interface';

export interface AuthResult {
  accessToken: string;
  user: UserView;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Registro público. Crea un usuario SIN roles; la asignación de
   * roles/permisos la hace un administrador vía el módulo de usuarios.
   */
  async register(dto: RegisterDto): Promise<AuthResult> {
    const user = await this.usersService.create({
      email: dto.email,
      password: dto.password,
      name: dto.name,
    });
    return this.buildResult(user.id, user.email, user);
  }

  async login(dto: LoginDto): Promise<AuthResult> {
    const user = await this.usersService.findByEmailWithPassword(dto.email);

    // Mensaje genérico para no revelar si el email existe.
    if (!user) {
      throw new UnauthorizedException('Credenciales inválidas');
    }
    if (!user.isActive) {
      throw new UnauthorizedException('La cuenta está desactivada');
    }

    const passwordMatches = await bcrypt.compare(dto.password, user.password);
    if (!passwordMatches) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const fullUser = await this.usersService.findOne(user.id);
    return this.buildResult(user.id, user.email, fullUser);
  }

  private buildResult(
    userId: string,
    email: string,
    userEntity: Parameters<typeof toUserView>[0],
  ): AuthResult {
    const payload: JwtPayload = { sub: userId, email };
    const accessToken = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('JWT_SECRET') ?? 'change_me',
      expiresIn: this.configService.get<string>('JWT_EXPIRES_IN') ?? '1h',
    });

    return { accessToken, user: toUserView(userEntity) };
  }
}

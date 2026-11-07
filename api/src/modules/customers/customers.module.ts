import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  CustomerAuthService,
  customerJwtSecret,
} from './customer-auth.service';
import { CustomersController } from './customers.controller';
import { CustomersService } from './customers.service';
import { CustomGeneration } from './entities/custom-generation.entity';
import { Customer } from './entities/customer.entity';
import { CustomerJwtStrategy } from './strategies/customer-jwt.strategy';
import { WhatsappOtpService } from './whatsapp-otp.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Customer, CustomGeneration]),
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: customerJwtSecret(config),
        signOptions: {
          expiresIn: config.get<string>('CUSTOMER_JWT_EXPIRES_IN') ?? '30d',
        },
      }),
    }),
  ],
  controllers: [CustomersController],
  providers: [
    CustomersService,
    CustomerAuthService,
    CustomerJwtStrategy,
    WhatsappOtpService,
  ],
  exports: [CustomersService],
})
export class CustomersModule {}

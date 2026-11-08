import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MoreThan, Repository } from 'typeorm';
import { RegisterCustomerDto } from './dto/register-customer.dto';
import { CustomGeneration } from './entities/custom-generation.entity';
import { Customer } from './entities/customer.entity';

@Injectable()
export class CustomersService {
  constructor(
    @InjectRepository(Customer)
    private readonly customersRepository: Repository<Customer>,
    @InjectRepository(CustomGeneration)
    private readonly generationsRepository: Repository<CustomGeneration>,
  ) {}

  /** Cuenta las generaciones de color del cliente en la última hora. */
  countGenerationsLastHour(customerId: string): Promise<number> {
    const since = new Date(Date.now() - 60 * 60 * 1000);
    return this.generationsRepository.count({
      where: { customerId, createdAt: MoreThan(since) },
    });
  }

  /** Registra una generación de color (para el tope por hora). */
  async recordGeneration(
    customerId: string,
    productId: string,
    colorId: string | null,
  ): Promise<void> {
    await this.generationsRepository.save(
      this.generationsRepository.create({ customerId, productId, colorId }),
    );
  }

  /**
   * Normaliza el celular a solo dígitos. Llega en formato internacional
   * (indicativo + número). Los colombianos (57 + 10 dígitos) se guardan sin
   * el 57 por compatibilidad con las cuentas creadas antes del selector de
   * país; el resto de países se guarda completo.
   */
  normalizePhone(raw: string): string {
    const digits = (raw ?? '').replace(/\D/g, '');
    if (digits.length === 12 && digits.startsWith('57')) {
      return digits.slice(2);
    }
    return digits;
  }

  /**
   * Crea un cliente (lead) de una tienda. El celular ya viene VERIFICADO por
   * OTP (lo toma del token de registro, no del cuerpo). Es único por tienda.
   */
  async register(
    storeId: string,
    verifiedPhone: string,
    dto: RegisterCustomerDto,
  ): Promise<Customer> {
    if (!dto.marketingOptIn) {
      throw new BadRequestException(
        'Debes aceptar los términos y el consentimiento para registrarte',
      );
    }

    const phone = this.normalizePhone(verifiedPhone);
    if (phone.length < 7) {
      throw new BadRequestException('El número de celular no es válido');
    }
    const existing = await this.findByPhone(storeId, phone);
    if (existing) {
      throw new BadRequestException('El celular ya está registrado');
    }

    const email = dto.email?.trim().toLowerCase() || null;

    const customer = this.customersRepository.create({
      storeId,
      phone,
      email,
      password: null,
      name: dto.name.trim(),
      gender: dto.gender ?? null,
      city: dto.city ?? null,
      interests: dto.interests ?? [],
      acquisitionSource: dto.acquisitionSource ?? null,
      marketingOptIn: true,
      consentAt: new Date(),
      consentVersion: dto.consentVersion ?? null,
      signupOrigin: dto.signupOrigin ?? null,
    });
    return this.customersRepository.save(customer);
  }

  /** Busca el cliente de una tienda por celular (único por tienda). */
  findByPhone(storeId: string, phone: string): Promise<Customer | null> {
    return this.customersRepository.findOne({
      where: { storeId, phone: this.normalizePhone(phone) },
    });
  }

  async findOne(id: string): Promise<Customer> {
    const customer = await this.customersRepository.findOne({
      where: { id },
    });
    if (!customer) {
      throw new NotFoundException('Cliente no encontrado');
    }
    return customer;
  }

  /** Actualiza datos de perfil del cliente (no celular ni contraseña). */
  async updateProfile(
    id: string,
    patch: {
      name?: string;
      email?: string;
      gender?: Customer['gender'];
      city?: string;
      interests?: string[];
    },
  ): Promise<Customer> {
    const customer = await this.findOne(id);
    if (patch.name !== undefined) customer.name = patch.name.trim();
    if (patch.email !== undefined)
      customer.email = patch.email.trim().toLowerCase() || null;
    if (patch.gender !== undefined) customer.gender = patch.gender;
    if (patch.city !== undefined) customer.city = patch.city.trim() || null;
    if (patch.interests !== undefined) customer.interests = patch.interests;
    return this.customersRepository.save(customer);
  }

  /** Cambia la preferencia de marketing (configuración). */
  async setMarketingOptIn(id: string, value: boolean): Promise<Customer> {
    const customer = await this.findOne(id);
    customer.marketingOptIn = value;
    return this.customersRepository.save(customer);
  }

  /** Para la estrategia JWT: cliente activo por id (o null). */
  findActiveById(id: string): Promise<Customer | null> {
    return this.customersRepository.findOne({ where: { id, isActive: true } });
  }
}

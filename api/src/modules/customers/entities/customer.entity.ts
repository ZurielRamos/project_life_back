import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

/** Género declarado por el cliente (para segmentación de campañas). */
export type CustomerGender = 'female' | 'male' | 'other' | 'prefer_not';

/**
 * Cliente de la tienda (lead). Se registra desde el storefront para
 * desbloquear la generación completa de su diseño; sus datos se usan para
 * segmentar campañas por WhatsApp/email. Es un sistema de auth SEPARADO del
 * de administración (entidad `User`): un token de cliente nunca da acceso al
 * panel.
 */
@Entity('customers')
export class Customer {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // --- Identidad / login ---

  /**
   * Teléfono (celular colombiano). Es el IDENTIFICADOR de login y debe ser
   * único. Solo operamos en Colombia, así que no se guarda indicativo.
   */
  @Index({ unique: true })
  @Column({ type: 'varchar' })
  phone: string;

  /**
   * Obsoleto: la autenticación ahora es por OTP de WhatsApp, no por
   * contraseña. Se conserva la columna (nullable) para cuentas creadas antes
   * del cambio; no se usa para validar el acceso. `select: false` para no
   * exponerla por defecto.
   */
  @Column({ type: 'varchar', select: false, nullable: true })
  password: string | null;

  @Column()
  name: string;

  /** Correo opcional (canal de campañas secundario). */
  @Column({ type: 'varchar', nullable: true })
  email: string | null;

  // --- Segmentación ---

  @Column({ type: 'varchar', nullable: true })
  gender: CustomerGender | null;

  @Column({ type: 'varchar', nullable: true })
  city: string | null;

  /**
   * Líneas de negocio / intereses que marcó (para segmentar campañas).
   * Lista de claves; las opciones las define el catálogo de la app.
   */
  @Column({ type: 'jsonb', default: () => "'[]'" })
  interests: string[];

  /** Cómo nos conoció (fuente de adquisición). */
  @Column({ name: 'acquisition_source', type: 'varchar', nullable: true })
  acquisitionSource: string | null;

  // --- Consentimiento (legal) ---

  /** Acepta recibir publicidad por WhatsApp/email. */
  @Column({ name: 'marketing_opt_in', default: false })
  marketingOptIn: boolean;

  /** Momento en que aceptó los términos/consentimiento. */
  @Column({ name: 'consent_at', type: 'timestamp', nullable: true })
  consentAt: Date | null;

  /** Versión del texto de términos aceptado (para auditoría). */
  @Column({ name: 'consent_version', type: 'varchar', nullable: true })
  consentVersion: string | null;

  /** Origen del registro (p.ej. slug del diseño desde el que se registró). */
  @Column({ name: 'signup_origin', type: 'varchar', nullable: true })
  signupOrigin: string | null;

  // --- Estado ---

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Store } from './store.entity';

/**
 * Credenciales y ajustes de notificaciones de una tienda (correo SMTP y
 * WhatsApp). Vive en su propia tabla para que estos datos no viajen en las
 * respuestas normales de la tienda. Los secretos se guardan cifrados
 * (ver common/secret-box.ts) y nunca se devuelven a la API.
 */
@Entity('store_notification_settings')
export class StoreNotificationSettings {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'store_id', unique: true })
  storeId: string;

  @OneToOne(() => Store, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'store_id' })
  store: Store;

  // --- Correo (SMTP) ---

  @Column({ name: 'smtp_enabled', default: false })
  smtpEnabled: boolean;

  @Column({ name: 'smtp_host', type: 'varchar', nullable: true })
  smtpHost: string | null;

  @Column({ name: 'smtp_port', type: 'int', default: 587 })
  smtpPort: number;

  /** true = TLS implícito (puerto 465); false = STARTTLS si el servidor lo ofrece. */
  @Column({ name: 'smtp_secure', default: false })
  smtpSecure: boolean;

  @Column({ name: 'smtp_username', type: 'varchar', nullable: true })
  smtpUsername: string | null;

  /** Contraseña cifrada (AES-256-GCM). */
  @Column({ name: 'smtp_password_enc', type: 'text', nullable: true })
  smtpPasswordEnc: string | null;

  @Column({ name: 'smtp_from_name', type: 'varchar', nullable: true })
  smtpFromName: string | null;

  @Column({ name: 'smtp_from_email', type: 'varchar', nullable: true })
  smtpFromEmail: string | null;

  // --- WhatsApp (API de Strategee) ---

  @Column({ name: 'wa_enabled', default: false })
  waEnabled: boolean;

  /** URL base de la API, p. ej. https://smarter.strategee.us */
  @Column({ name: 'wa_api_url', type: 'varchar', nullable: true })
  waApiUrl: string | null;

  /** Slug de la cuenta en la API (parte de la ruta /v1/<cuenta>/…). */
  @Column({ name: 'wa_account_slug', type: 'varchar', nullable: true })
  waAccountSlug: string | null;

  /** Id del canal (inbox) desde el que se envía. */
  @Column({ name: 'wa_channel_id', type: 'varchar', nullable: true })
  waChannelId: string | null;

  @Column({ name: 'wa_template_name', type: 'varchar', nullable: true })
  waTemplateName: string | null;

  @Column({ name: 'wa_language_code', type: 'varchar', default: 'es' })
  waLanguageCode: string;

  /** Token de la API cifrado (AES-256-GCM). */
  @Column({ name: 'wa_api_token_enc', type: 'text', nullable: true })
  waApiTokenEnc: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

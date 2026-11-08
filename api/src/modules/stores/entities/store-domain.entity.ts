import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Store } from './store.entity';

/**
 * pending: esperando que el cliente configure los DNS (o el TXT de verificación).
 * active: DNS correctos; el dominio ya enruta a la tienda.
 * error: se agotó el plazo de verificación o falló el proveedor.
 */
export type StoreDomainStatus = 'pending' | 'active' | 'error';

/** pending: aún sin certificado válido; issued: HTTPS responde con TLS válido. */
export type StoreDomainSslStatus = 'pending' | 'issued';

/** Registro DNS que el cliente debe crear en su proveedor. */
export interface DnsRecord {
  type: 'A' | 'CNAME' | 'TXT';
  /** Nombre relativo al dominio ("@" para la raíz). */
  name: string;
  value: string;
  purpose: 'routing' | 'verification';
}

/** Dominio personalizado (apex o subdominio) asociado a una tienda. */
@Entity('store_domains')
export class StoreDomain {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'store_id' })
  storeId: string;

  @ManyToOne(() => Store, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'store_id' })
  store: Store;

  /** Host normalizado en minúsculas; único globalmente. */
  @Column({ unique: true })
  hostname: string;

  /** apex = dominio raíz (mitienda.com); subdomain = shop.mitienda.com. */
  @Column({ type: 'varchar', default: 'subdomain' })
  kind: 'apex' | 'subdomain';

  /** Dominio favorito de la tienda (URL canónica). Solo uno por tienda. */
  @Column({ name: 'is_primary', default: false })
  isPrimary: boolean;

  @Index()
  @Column({ type: 'varchar', default: 'pending' })
  status: StoreDomainStatus;

  @Column({ name: 'ssl_status', type: 'varchar', default: 'pending' })
  sslStatus: StoreDomainSslStatus;

  /** Registros DNS a mostrar al cliente (calculados en cada verificación). */
  @Column({ name: 'dns_records', type: 'jsonb', default: () => "'[]'" })
  dnsRecords: DnsRecord[];

  @Column({ name: 'last_error', type: 'text', nullable: true })
  lastError: string | null;

  @Column({ name: 'last_checked_at', type: 'timestamptz', nullable: true })
  lastCheckedAt: Date | null;

  @Column({ name: 'verified_at', type: 'timestamptz', nullable: true })
  verifiedAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

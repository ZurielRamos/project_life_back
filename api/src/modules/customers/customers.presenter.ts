import { Customer } from './entities/customer.entity';

/** Vista pública de un cliente (sin password). */
export interface CustomerView {
  id: string;
  phone: string;
  name: string;
  email: string | null;
  gender: string | null;
  city: string | null;
  interests: string[];
  marketingOptIn: boolean;
  createdAt: string;
}

export function toCustomerView(customer: Customer): CustomerView {
  return {
    id: customer.id,
    phone: customer.phone,
    name: customer.name,
    email: customer.email ?? null,
    gender: customer.gender ?? null,
    city: customer.city ?? null,
    interests: customer.interests ?? [],
    marketingOptIn: !!customer.marketingOptIn,
    createdAt:
      customer.createdAt instanceof Date
        ? customer.createdAt.toISOString()
        : String(customer.createdAt),
  };
}

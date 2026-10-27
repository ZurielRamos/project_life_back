import { User } from './entities/user.entity';

/**
 * Forma pública de un usuario (sin password). Centraliza la serialización
 * para no exponer accidentalmente datos sensibles en las respuestas.
 */
export interface UserView {
  id: string;
  email: string;
  name: string | null;
  isActive: boolean;
  roles: { id: string; name: string }[];
  createdAt: Date;
  updatedAt: Date;
}

export function toUserView(user: User): UserView {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    isActive: user.isActive,
    roles: (user.roles ?? []).map((role) => ({
      id: role.id,
      name: role.name,
    })),
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

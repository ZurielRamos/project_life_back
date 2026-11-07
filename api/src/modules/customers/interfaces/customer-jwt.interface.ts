/**
 * Contenido del JWT de cliente. `typ: 'customer'` distingue estos tokens de
 * los de administración (que no llevan el claim). Además usan un secreto
 * distinto, así un token no valida contra la estrategia del otro dominio.
 */
export interface CustomerJwtPayload {
  /** subject: id del cliente */
  sub: string;
  /** celular (identificador de login) */
  phone: string;
  typ: 'customer';
}

/** Cliente autenticado que la estrategia adjunta a request.user. */
export interface AuthenticatedCustomer {
  id: string;
  phone: string;
  name: string;
}

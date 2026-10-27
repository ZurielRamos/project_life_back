/**
 * Forma del objeto que JwtStrategy adjunta a request.user tras validar
 * el token. Contiene los permisos ya resueltos (aplanados desde los roles)
 * para que el PermissionsGuard no tenga que consultar la BD en cada request.
 */
export interface AuthenticatedUser {
  id: string;
  email: string;
  roles: string[];
  permissions: string[];
}

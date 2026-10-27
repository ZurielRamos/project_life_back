/**
 * Contenido del JWT. Se mantiene reducido (solo el sub = id del usuario);
 * los permisos se resuelven desde la BD al validar para evitar tokens
 * obsoletos cuando cambian los roles/permisos del usuario.
 */
export interface JwtPayload {
  /** subject: id del usuario */
  sub: string;
  email: string;
}

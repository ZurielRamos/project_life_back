/**
 * Catálogo central de permisos del sistema (fuente de verdad).
 *
 * Convención: "recurso:accion".
 * Agregar un permiso nuevo = agregar una entrada aquí y sembrarla
 * (ver seed). Los guards comparan contra estos strings, así que no
 * hace falta tocar lógica para introducir granularidad nueva.
 */
export enum Permissions {
  // Usuarios
  UsersCreate = 'users:create',
  UsersRead = 'users:read',
  UsersUpdate = 'users:update',
  UsersDelete = 'users:delete',

  // Roles
  RolesCreate = 'roles:create',
  RolesRead = 'roles:read',
  RolesUpdate = 'roles:update',
  RolesDelete = 'roles:delete',
  RolesAssign = 'roles:assign',

  // Permisos
  PermissionsRead = 'permissions:read',

  // Productos (incluye sus sesiones de fotos y los mockups embebidos)
  ProductsCreate = 'products:create',
  ProductsRead = 'products:read',
  ProductsUpdate = 'products:update',
  ProductsDelete = 'products:delete',
  /** Importar plantillas desde SudoMock a una sesión. */
  ProductsImport = 'products:import',

  // Diseños
  DesignsCreate = 'designs:create',
  DesignsRead = 'designs:read',
  DesignsUpdate = 'designs:update',
  DesignsDelete = 'designs:delete',
}

/** Lista plana de todos los permisos, útil para seeds y validaciones. */
export const ALL_PERMISSIONS: Permissions[] = Object.values(Permissions);

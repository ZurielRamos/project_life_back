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

  // Categorías de ajuste (fit) del catálogo
  FitCategoriesRead = 'fit-categories:read',
  FitCategoriesCreate = 'fit-categories:create',
  FitCategoriesDelete = 'fit-categories:delete',

  // Diseños
  DesignsCreate = 'designs:create',
  DesignsRead = 'designs:read',
  DesignsUpdate = 'designs:update',
  DesignsDelete = 'designs:delete',

  // Fuentes (tipografías para plantillas SVG)
  FontsRead = 'fonts:read',
  FontsCreate = 'fonts:create',
  FontsDelete = 'fonts:delete',

  // Ajustes de generación (límites de "crea tu camiseta")
  GenerationSettingsRead = 'generation-settings:read',
  GenerationSettingsUpdate = 'generation-settings:update',

  // Tiendas (ecommerce configurables con dominio, productos y diseños)
  StoresCreate = 'stores:create',
  StoresRead = 'stores:read',
  StoresUpdate = 'stores:update',
  StoresDelete = 'stores:delete',
  /** Ver y editar las credenciales de notificaciones (SMTP, WhatsApp) de una tienda. */
  StoresNotifications = 'stores:notifications',

  // Clientes / leads del storefront
  CustomersRead = 'customers:read',
}

/** Lista plana de todos los permisos, útil para seeds y validaciones. */
export const ALL_PERMISSIONS: Permissions[] = Object.values(Permissions);

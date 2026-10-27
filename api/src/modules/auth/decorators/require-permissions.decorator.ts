import { SetMetadata } from '@nestjs/common';
import { Permissions } from '../permissions.enum';

export const PERMISSIONS_KEY = 'required_permissions';

/**
 * Marca un handler o controlador con los permisos requeridos.
 * El PermissionsGuard los lee y verifica que el usuario los posea.
 *
 * Ejemplo:
 *   @RequirePermissions(Permissions.UsersCreate)
 *   create() { ... }
 *
 * Si se pasan varios, se exigen TODOS (AND).
 */
export const RequirePermissions = (...permissions: Permissions[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);

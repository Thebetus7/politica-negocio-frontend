import { inject } from '@angular/core';
import { CanActivateFn, Router, ActivatedRouteSnapshot } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const roleGuard: CanActivateFn = (route: ActivatedRouteSnapshot, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  
  // Obtenemos los roles permitidos desde la configuración de la ruta
  const expectedRoles = route.data?.['roles'] as Array<string>;
  
  if (!authService.isAuthenticated()) {
    return router.createUrlTree(['/login']);
  }
  
  // Si no hay roles específicos requeridos, dejamos pasar (aunque debería protegerse con authGuard)
  if (!expectedRoles || expectedRoles.length === 0) {
    return true;
  }
  
  // Verificamos si el usuario tiene al menos uno de los roles requeridos
  if (authService.hasAnyRole(expectedRoles)) {
    return true;
  }
  
  // Si no tiene permisos, lo mandamos al dashboard por defecto (o a una ruta de no autorizado)
  return router.createUrlTree(['/dashboard']);
};

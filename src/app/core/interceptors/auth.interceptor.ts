import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const token = authService.token();
  const isAuthUrl = req.url.includes('/api/auth/');
  
  if (token && !isAuthUrl) {
    console.log('Adjuntando token a la peticion:', req.url);
    req = req.clone({
      setHeaders: { Authorization: `Bearer ${token}` },
    });
  } else if (token && isAuthUrl) {
    console.log('Omitiendo token para endpoint de autenticacion:', req.url);
  } else if (!token) {
    console.warn('No hay token para la peticion:', req.url);
  }
  
  return next(req);
};

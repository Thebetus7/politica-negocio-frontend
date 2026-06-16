import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const token = authService.token();
  const isAuthUrl = req.url.includes('/api/auth/');

  if (!token || isAuthUrl) {
    if (!token && !isAuthUrl) {
      console.warn('No hay token para la peticion:', req.url);
    }
    return next(req);
  }

  // headers.set preserva FormData/multipart sin romper el boundary
  const authReq = req.clone({
    headers: req.headers.set('Authorization', `Bearer ${token}`),
  });
  console.log('Adjuntando token a la peticion:', req.url);
  return next(authReq);
};

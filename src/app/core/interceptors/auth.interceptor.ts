import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const token = authService.token();
  const isAuthUrl = req.url.includes('/api/auth/');
  // Omitir peticiones externas a APIs de terceros (como las de Google Gemini)
  const isExternalUrl = req.url.startsWith('http') && !req.url.includes('localhost') && !req.url.includes('127.0.0.1');

  if (!token || isAuthUrl || isExternalUrl) {
    if (!token && !isAuthUrl && !isExternalUrl) {
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

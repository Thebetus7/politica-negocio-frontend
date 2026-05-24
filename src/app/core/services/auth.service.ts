import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { catchError, map, of, switchMap, tap, throwError } from 'rxjs';

export interface ApiErrorBody {
  message?: string;
  code?: string;
}

export interface User {
  id: string;
  nombre: string;
  correo: string;
  rol: string;
}

export interface AuthResponse {
  token: string;
  id: string;
  nombre: string;
  correo: string;
  rol: string;
}

interface ExistsResponse {
  exists: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);
  private apiUrl = 'http://localhost:8081/api/auth';

  // Signals para manejar el estado
  private tokenSignal = signal<string | null>(localStorage.getItem('token'));
  private userSignal = signal<User | null>(null);

  // Derivados (Computed)
  isAuthenticated = computed(() => !!this.tokenSignal());
  currentUser = computed(() => this.userSignal());
  token = computed(() => this.tokenSignal());

  constructor() {
    // Intentar reconstruir el usuario desde el localStorage si existe el token
    // En una app real, podrías guardar el objeto user en localStorage o llamar a un endpoint /me
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      this.userSignal.set(JSON.parse(savedUser));
    }
  }

  login(credentials: { correo: string; password: string }) {
    return this.http.post<AuthResponse>(`${this.apiUrl}/login`, credentials).pipe(
      tap(res => {
        this.setSession(res);
      }),
      catchError((error: unknown) => {
        // Si backend devuelve errores detallados, propagamos tal cual.
        const directMessage = this.tryExtractBackendMessage(error);
        if (directMessage) {
          return throwError(() => new Error(directMessage));
        }

        // Fallback para casos donde backend responde 403 vacío.
        if (error instanceof HttpErrorResponse && error.status === 403) {
          return this.checkCorreoExists(credentials.correo).pipe(
            map(exists => {
              throw new Error(
                exists
                  ? 'La contraseña es incorrecta.'
                  : 'No existe una cuenta registrada con ese correo electrónico.'
              );
            }),
            catchError(() =>
              throwError(() => new Error('Error al iniciar sesión. Intenta de nuevo.'))
            )
          );
        }

        return throwError(() => new Error('Error al iniciar sesión. Intenta de nuevo.'));
      })
    );
  }

  /** Mensaje legible desde la respuesta JSON del backend (login). */
  getLoginErrorMessage(error: unknown): string {
    if (error instanceof Error && error.message) {
      return error.message;
    }

    if (!(error instanceof HttpErrorResponse)) {
      return 'Error al iniciar sesión. Intenta de nuevo.';
    }

    const body = error.error as ApiErrorBody | string | null;

    if (body && typeof body === 'object' && body.message) {
      return body.message;
    }

    if (error.status === 404) {
      return 'No existe una cuenta registrada con ese correo electrónico.';
    }
    if (error.status === 401) {
      return 'La contraseña es incorrecta.';
    }

    return 'Error al iniciar sesión. Intenta de nuevo.';
  }

  private checkCorreoExists(correo: string) {
    return this.http
      .get<ExistsResponse>(`${this.apiUrl}/exists`, { params: { correo } })
      .pipe(map(res => !!res.exists));
  }

  private tryExtractBackendMessage(error: unknown): string | null {
    if (!(error instanceof HttpErrorResponse)) {
      return null;
    }
    const body = error.error as ApiErrorBody | string | null;
    if (body && typeof body === 'object' && body.message) {
      return body.message;
    }
    return null;
  }

  register(data: { nombre: string; correo: string; password: string }) {
    return this.http.post<AuthResponse>(`${this.apiUrl}/register`, data).pipe(
      tap(res => {
        this.setSession(res);
      })
    );
  }

  private setSession(authResponse: AuthResponse) {
    localStorage.setItem('token', authResponse.token);
    const user: User = {
      id: authResponse.id,
      nombre: authResponse.nombre,
      correo: authResponse.correo,
      rol: authResponse.rol
    };
    localStorage.setItem('user', JSON.stringify(user));
    this.tokenSignal.set(authResponse.token);
    this.userSignal.set(user);
  }

  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    this.tokenSignal.set(null);
    this.userSignal.set(null);
    this.router.navigate(['/login']);
  }

  // Utilidades para roles
  hasRole(role: string): boolean {
    const user = this.userSignal();
    return !!user && user.rol === role;
  }

  hasAnyRole(roles: string[]): boolean {
    const user = this.userSignal();
    return !!user && roles.includes(user.rol);
  }

  isAdmin(): boolean {
    return this.hasRole('ADMINISTRADOR');
  }
}

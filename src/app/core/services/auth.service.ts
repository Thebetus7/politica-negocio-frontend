import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { tap } from 'rxjs';

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
      })
    );
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

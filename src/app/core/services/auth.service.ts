import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { tap } from 'rxjs';

export interface User {
  id: number;
  username: string;
  roles: string[];
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);

  // Signals para manejar el estado
  private tokenSignal = signal<string | null>(localStorage.getItem('token'));
  private userSignal = signal<User | null>(null);

  // Derivados (Computed)
  isAuthenticated = computed(() => !!this.tokenSignal());
  currentUser = computed(() => this.userSignal());
  token = computed(() => this.tokenSignal());

  constructor() {
    // Si hay token al iniciar, obtener info del usuario
    if (this.tokenSignal()) {
      this.fetchProfile().subscribe({
        error: () => this.logout() // Si falla, limpiar
      });
    }
  }

  login(credentials: { username: string; password: string }) {
    return this.http.post<{ status: string, token?: string, user?: User, message?: string }>(
      'http://localhost:8080/api/auth/login', 
      credentials
    ).pipe(
      tap(res => {
        if (res.status === 'success' && res.token && res.user) {
          localStorage.setItem('token', res.token);
          this.tokenSignal.set(res.token);
          this.userSignal.set(res.user);
        } else {
          throw new Error(res.message || 'Error en login');
        }
      })
    );
  }

  fetchProfile() {
    return this.http.get<User>('http://localhost:8080/api/auth/me').pipe(
      tap(user => {
        this.userSignal.set(user);
      })
    );
  }

  logout() {
    localStorage.removeItem('token');
    this.tokenSignal.set(null);
    this.userSignal.set(null);
    this.router.navigate(['/login']);
  }
}

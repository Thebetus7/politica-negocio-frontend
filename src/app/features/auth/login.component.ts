import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="min-h-screen flex flex-col sm:justify-center items-center pt-6 sm:pt-0 bg-gray-100 dark:bg-gray-900">
      <div>
        <a href="/">
          <svg class="w-16 h-16 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </a>
      </div>

      <div class="w-full sm:max-w-md mt-6 px-6 py-4 bg-white dark:bg-gray-800 shadow-md overflow-hidden sm:rounded-lg">
        
        @if (errorMsg()) {
          <div class="mb-4 font-medium text-sm text-red-600 dark:text-red-400">
            {{ errorMsg() }}
          </div>
        }

        <form (ngSubmit)="onSubmit()">
          <div>
            <label for="username" class="block font-medium text-sm text-gray-700 dark:text-gray-300">Usuario</label>
            <input id="username" type="text" [(ngModel)]="username" name="username" class="border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 focus:border-indigo-500 dark:focus:border-indigo-600 focus:ring-indigo-500 dark:focus:ring-indigo-600 rounded-md shadow-sm block w-full mt-1 p-2 border" required autofocus autocomplete="username">
          </div>

          <div class="mt-4">
            <label for="password" class="block font-medium text-sm text-gray-700 dark:text-gray-300">Contraseña</label>
            <input id="password" type="password" [(ngModel)]="password" name="password" class="border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 focus:border-indigo-500 dark:focus:border-indigo-600 focus:ring-indigo-500 dark:focus:ring-indigo-600 rounded-md shadow-sm block w-full mt-1 p-2 border" required autocomplete="current-password">
          </div>

          <div class="flex items-center justify-end mt-4">
            <a class="underline text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:focus:ring-offset-gray-800">
              ¿Olvidaste tu contraseña?
            </a>

            <button type="submit" [disabled]="loading()" class="ms-4 inline-flex items-center px-4 py-2 bg-gray-800 dark:bg-gray-200 border border-transparent rounded-md font-semibold text-xs text-white dark:text-gray-800 uppercase tracking-widest hover:bg-gray-700 dark:hover:bg-white focus:bg-gray-700 dark:focus:bg-white active:bg-gray-900 dark:active:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 transition ease-in-out duration-150 disabled:opacity-50">
              {{ loading() ? 'Cargando...' : 'Iniciar Sesión' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  `
})
export class LoginComponent {
  username = '';
  password = '';
  errorMsg = signal('');
  loading = signal(false);

  private authService = inject(AuthService);
  private router = inject(Router);

  onSubmit() {
    this.loading.set(true);
    this.errorMsg.set('');

    this.authService.login({ username: this.username, password: this.password }).subscribe({
      next: () => {
        this.router.navigate(['/dashboard']);
      },
      error: (err) => {
        this.errorMsg.set(err.message || 'Error al iniciar sesión');
        this.loading.set(false);
      }
    });
  }
}

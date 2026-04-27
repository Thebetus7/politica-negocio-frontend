import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [FormsModule, RouterLink],
  template: `
    <div class="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div class="max-w-md w-full space-y-8 bg-white dark:bg-gray-800 p-10 rounded-xl shadow-2xl border border-gray-100 dark:border-gray-700">
        <div>
          <div class="mx-auto h-16 w-16 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg transform rotate-6 transition hover:rotate-0 duration-300">
             <span class="text-white text-3xl font-bold">P</span>
          </div>
          <h2 class="mt-6 text-center text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">
            Crea tu cuenta
          </h2>
          <p class="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
            Únete a nuestra plataforma de políticas de negocio
          </p>
        </div>
        
        <form class="mt-8 space-y-6" (ngSubmit)="onSubmit()">
          @if (errorMsg()) {
            <div class="bg-red-50 dark:bg-red-900/30 border-l-4 border-red-500 p-4 rounded-md animate-pulse">
              <div class="flex">
                <div class="flex-shrink-0">
                  <svg class="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
                  </svg>
                </div>
                <div class="ml-3">
                  <p class="text-sm text-red-700 dark:text-red-200 font-medium">{{ errorMsg() }}</p>
                </div>
              </div>
            </div>
          }

          <div class="space-y-4">
            <div>
              <label for="name" class="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Nombre Completo</label>
              <input id="name" name="nombre" type="text" required [(ngModel)]="nombre"
                class="appearance-none relative block w-full px-4 py-3 border border-gray-300 dark:border-gray-600 placeholder-gray-500 text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent sm:text-sm bg-gray-50 dark:bg-gray-700/50 transition-all hover:border-indigo-400"
                placeholder="Juan Pérez">
            </div>
            <div>
              <label for="email" class="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Correo Electrónico</label>
              <input id="email" name="correo" type="email" required [(ngModel)]="correo"
                class="appearance-none relative block w-full px-4 py-3 border border-gray-300 dark:border-gray-600 placeholder-gray-500 text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent sm:text-sm bg-gray-50 dark:bg-gray-700/50 transition-all hover:border-indigo-400"
                placeholder="nombre@ejemplo.com">
            </div>
            <div>
              <label for="password" class="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Contraseña</label>
              <input id="password" name="password" type="password" required [(ngModel)]="password"
                class="appearance-none relative block w-full px-4 py-3 border border-gray-300 dark:border-gray-600 placeholder-gray-500 text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent sm:text-sm bg-gray-50 dark:bg-gray-700/50 transition-all hover:border-indigo-400"
                placeholder="••••••••">
            </div>
          </div>

          <div>
            <button type="submit" [disabled]="loading()"
              class="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-bold rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all shadow-lg hover:shadow-xl active:transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed">
              @if (loading()) {
                <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Creando cuenta...
              } @else {
                Registrarse
              }
            </button>
          </div>

          <div class="text-center mt-4">
            <p class="text-sm text-gray-600 dark:text-gray-400">
              ¿Ya tienes una cuenta? 
              <a routerLink="/login" class="font-bold text-indigo-600 hover:text-indigo-500 transition-colors">Inicia sesión</a>
            </p>
          </div>
        </form>
      </div>
    </div>
  `
})
export class RegisterComponent {
  nombre = '';
  correo = '';
  password = '';
  errorMsg = signal('');
  loading = signal(false);

  private authService = inject(AuthService);
  private router = inject(Router);

  onSubmit() {
    this.loading.set(true);
    this.errorMsg.set('');

    this.authService.register({ 
      nombre: this.nombre, 
      correo: this.correo, 
      password: this.password 
    }).subscribe({
      next: () => {
        this.router.navigate(['/dashboard']);
      },
      error: (err) => {
        this.errorMsg.set(err.message || 'Error al registrarse');
        this.loading.set(false);
      }
    });
  }
}

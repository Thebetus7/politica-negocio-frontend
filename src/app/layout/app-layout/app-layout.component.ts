import { Component, inject, signal } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <div class="min-h-screen bg-gray-100 dark:bg-gray-900">
      <nav class="bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 shadow-sm sticky top-0 z-50">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div class="flex justify-between h-16">
            <div class="flex">
              <!-- Logo -->
              <div class="shrink-0 flex items-center">
                <a routerLink="/dashboard" class="flex items-center space-x-2">
                  <div class="bg-indigo-600 p-1.5 rounded-lg shadow-md">
                    <svg class="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <span class="font-bold text-xl text-gray-800 dark:text-gray-200 hidden md:block">PoliticasApp</span>
                </a>
              </div>

              <!-- Navigation Links -->
              <div class="hidden space-x-8 sm:-my-px sm:ms-10 sm:flex">
                <a routerLink="/dashboard" routerLinkActive="border-indigo-500 text-indigo-600 dark:text-indigo-400" 
                   [routerLinkActiveOptions]="{exact: true}"
                   class="inline-flex items-center px-1 pt-1 border-b-2 border-transparent text-sm font-semibold leading-5 text-gray-500 hover:text-gray-700 hover:border-gray-300 focus:outline-none transition-all duration-200">
                  Dashboard
                </a>
                
                @if (authService.isAdmin()) {
                  <a routerLink="/departamentos" routerLinkActive="border-indigo-500 text-indigo-600 dark:text-indigo-400"
                     class="inline-flex items-center px-1 pt-1 border-b-2 border-transparent text-sm font-semibold leading-5 text-gray-500 hover:text-gray-700 hover:border-gray-300 focus:outline-none transition-all duration-200">
                    Departamentos
                  </a>
                  <a routerLink="/usuarios" routerLinkActive="border-indigo-500 text-indigo-600 dark:text-indigo-400"
                     class="inline-flex items-center px-1 pt-1 border-b-2 border-transparent text-sm font-semibold leading-5 text-gray-500 hover:text-gray-700 hover:border-gray-300 focus:outline-none transition-all duration-200">
                    Usuarios
                  </a>
                }
                
                @if (authService.hasRole('ATENCION_CLIENTE')) {
                  <a routerLink="/portafolios" routerLinkActive="border-indigo-500 text-indigo-600 dark:text-indigo-400"
                     class="inline-flex items-center px-1 pt-1 border-b-2 border-transparent text-sm font-semibold leading-5 text-gray-500 hover:text-gray-700 hover:border-gray-300 focus:outline-none transition-all duration-200">
                    Portafolios
                  </a>
                }

                @if (authService.hasAnyRole(['ADMINISTRADOR', 'FUNCIONARIO'])) {
                  <a routerLink="/politicas" routerLinkActive="border-indigo-500 text-indigo-600 dark:text-indigo-400"
                     class="inline-flex items-center px-1 pt-1 border-b-2 border-transparent text-sm font-semibold leading-5 text-gray-500 hover:text-gray-700 hover:border-gray-300 focus:outline-none transition-all duration-200">
                    Políticas
                  </a>
                }

                @if (authService.isAdmin()) {
                  <a routerLink="/formularios" routerLinkActive="border-indigo-500 text-indigo-600 dark:text-indigo-400"
                     class="inline-flex items-center px-1 pt-1 border-b-2 border-transparent text-sm font-semibold leading-5 text-gray-500 hover:text-gray-700 hover:border-gray-300 focus:outline-none transition-all duration-200">
                    Formularios
                  </a>
                }
              </div>
            </div>

            <!-- Settings Dropdown -->
            <div class="hidden sm:flex sm:items-center sm:ms-6">
              <div class="ms-3 relative group">
                <button class="flex items-center space-x-2 text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 focus:outline-none transition group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                  <div class="bg-gray-100 dark:bg-gray-700 h-8 w-8 rounded-full flex items-center justify-center font-bold text-indigo-600">
                    {{ authService.currentUser()?.nombre?.charAt(0) }}
                  </div>
                  <div class="font-semibold">{{ authService.currentUser()?.nombre }}</div>
                  <svg class="h-4 w-4 transition-transform group-hover:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                <!-- Dropdown menu -->
                <div class="absolute right-0 w-48 mt-2 origin-top-right bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 divide-y divide-gray-100 dark:divide-gray-700 rounded-xl shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                  <div class="px-4 py-3">
                    <p class="text-xs text-gray-500 uppercase tracking-wider font-bold">Logueado como</p>
                    <p class="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{{ authService.currentUser()?.correo }}</p>
                    <span class="inline-flex items-center px-2 py-0.5 mt-1 rounded text-xs font-medium bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200">
                      {{ authService.currentUser()?.rol }}
                    </span>
                  </div>
                  <div class="py-1">
                    <a routerLink="/perfil" class="block px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition">Mi Perfil</a>
                  </div>
                  <div class="py-1">
                    <button (click)="logout()" class="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition">
                      Cerrar Sesión
                    </button>
                  </div>
                </div>
              </div>
            </div>
            
            <!-- Mobile menu button -->
            <div class="-me-2 flex items-center sm:hidden">
              <button (click)="mobileMenuOpen.set(!mobileMenuOpen())" class="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 focus:outline-none transition">
                <svg class="h-6 w-6" stroke="currentColor" fill="none" viewBox="0 0 24 24">
                  <path [class.hidden]="mobileMenuOpen()" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
                  <path [class.hidden]="!mobileMenuOpen()" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        <!-- Mobile Navigation Menu -->
        <div [class.hidden]="!mobileMenuOpen()" class="sm:hidden border-b border-gray-200 dark:border-gray-700 animate-fade-in-down">
          <div class="pt-2 pb-3 space-y-1">
            <a routerLink="/dashboard" routerLinkActive="bg-indigo-50 border-indigo-500 text-indigo-700 dark:bg-gray-800 dark:text-white" class="block ps-3 pe-4 py-2 border-l-4 text-base font-medium transition">Dashboard</a>
            
            @if (authService.isAdmin()) {
              <a routerLink="/departamentos" routerLinkActive="bg-indigo-50 border-indigo-500 text-indigo-700 dark:bg-gray-800 dark:text-white" class="block ps-3 pe-4 py-2 border-l-4 border-transparent text-base font-medium text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition">Departamentos</a>
              <a routerLink="/usuarios" routerLinkActive="bg-indigo-50 border-indigo-500 text-indigo-700 dark:bg-gray-800 dark:text-white" class="block ps-3 pe-4 py-2 border-l-4 border-transparent text-base font-medium text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition">Usuarios</a>
            }
            
            @if (authService.hasRole('ATENCION_CLIENTE')) {
              <a routerLink="/portafolios" routerLinkActive="bg-indigo-50 border-indigo-500 text-indigo-700 dark:bg-gray-800 dark:text-white" class="block ps-3 pe-4 py-2 border-l-4 border-transparent text-base font-medium text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition">Portafolios</a>
            }

            @if (authService.hasAnyRole(['ADMINISTRADOR', 'FUNCIONARIO'])) {
              <a routerLink="/politicas" routerLinkActive="bg-indigo-50 border-indigo-500 text-indigo-700 dark:bg-gray-800 dark:text-white" class="block ps-3 pe-4 py-2 border-l-4 border-transparent text-base font-medium text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition">Políticas</a>
            }
            @if (authService.isAdmin()) {
              <a routerLink="/formularios" routerLinkActive="bg-indigo-50 border-indigo-500 text-indigo-700 dark:bg-gray-800 dark:text-white" class="block ps-3 pe-4 py-2 border-l-4 border-transparent text-base font-medium text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition">Formularios</a>
            }
          </div>
          <div class="pt-4 pb-1 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
            <div class="flex items-center px-4">
              <div class="bg-indigo-600 h-10 w-10 rounded-full flex items-center justify-center font-bold text-white shadow-md">
                {{ authService.currentUser()?.nombre?.charAt(0) }}
              </div>
              <div class="ml-3">
                <div class="font-bold text-base text-gray-800 dark:text-gray-200">{{ authService.currentUser()?.nombre }}</div>
                <div class="font-medium text-sm text-gray-500">{{ authService.currentUser()?.correo }}</div>
              </div>
            </div>
            <div class="mt-3 space-y-1">
              <button (click)="logout()" class="block w-full text-left ps-3 pe-4 py-2 border-l-4 border-transparent text-base font-medium text-red-600 hover:bg-red-50 transition">Cerrar Sesión</button>
            </div>
          </div>
        </div>
      </nav>

      <!-- Page Content -->
      <main class="py-10">
        <div class="max-w-7xl mx-auto sm:px-6 lg:px-8">
          <router-outlet></router-outlet>
        </div>
      </main>
    </div>
  `,
})
export class AppLayoutComponent {
  authService = inject(AuthService);
  mobileMenuOpen = signal(false);

  logout() {
    this.authService.logout();
  }
}

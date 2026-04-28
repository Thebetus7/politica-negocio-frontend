import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="bg-white dark:bg-gray-800 overflow-hidden shadow-xl sm:rounded-lg">
      <div class="p-6 sm:px-20 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div class="mt-8 text-2xl font-bold dark:text-gray-100">
          Bienvenido al Dashboard, {{ authService.currentUser()?.nombre }}!
        </div>

        <div class="mt-6 text-gray-500 dark:text-gray-400">
          Rol actual: <span class="font-semibold text-indigo-600 dark:text-indigo-400">{{ authService.currentUser()?.rol }}</span>
        </div>
      </div>

      <div class="bg-gray-200 dark:bg-gray-800 bg-opacity-25 grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8 p-6 lg:p-8">
        
        <!-- Sección para Administradores -->
        @if (authService.hasRole('ADMINISTRADOR')) {
          <div class="bg-white dark:bg-gray-700 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-600">
            <div class="flex items-center">
              <div class="p-3 bg-indigo-100 dark:bg-indigo-900/50 rounded-lg">
                <svg fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" viewBox="0 0 24 24" class="w-8 h-8 text-indigo-600 dark:text-indigo-400"><path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path></svg>
              </div>
              <h2 class="ms-3 text-xl font-semibold text-gray-900 dark:text-gray-100">
                Gestión de Políticas
              </h2>
            </div>
            <p class="mt-4 text-gray-500 dark:text-gray-400 text-sm leading-relaxed">
              Diseña y estandariza los procesos de la empresa usando el diagramador GoJS. Sincronización en tiempo real activa.
            </p>
            <div class="mt-4">
              <a routerLink="/politicas" class="text-indigo-600 dark:text-indigo-400 font-bold hover:underline">Ir a Políticas &rarr;</a>
            </div>
          </div>
        }

        <!-- Sección para Atención al Cliente -->
        @if (authService.hasRole('ATENCION_AL_CLIENTE')) {
          <div class="bg-white dark:bg-gray-700 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-600">
            <div class="flex items-center">
              <div class="p-3 bg-green-100 dark:bg-green-900/50 rounded-lg">
                <svg fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" viewBox="0 0 24 24" class="w-8 h-8 text-green-600 dark:text-green-400"><path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>
              </div>
              <h2 class="ms-3 text-xl font-semibold text-gray-900 dark:text-gray-100">
                Gestión de Portafolios
              </h2>
            </div>
            <p class="mt-4 text-gray-500 dark:text-gray-400 text-sm leading-relaxed">
              Registra y actualiza los datos de los clientes para ejecutar las políticas de negocio correspondientes.
            </p>
            <div class="mt-4">
              <a routerLink="/portafolios" class="text-green-600 dark:text-green-400 font-bold hover:underline">Gestionar Portafolios &rarr;</a>
            </div>
          </div>
        }

        <!-- Sección General de Usuarios (Disponible para Admin) -->
        @if (authService.hasRole('ADMINISTRADOR')) {
          <div class="bg-white dark:bg-gray-700 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-600">
            <div class="flex items-center">
              <div class="p-3 bg-blue-100 dark:bg-blue-900/50 rounded-lg">
                <svg fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" viewBox="0 0 24 24" class="w-8 h-8 text-blue-600 dark:text-blue-400"><path d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"></path></svg>
              </div>
              <h2 class="ms-3 text-xl font-semibold text-gray-900 dark:text-gray-100">
                Usuarios y Roles
              </h2>
            </div>
            <p class="mt-4 text-gray-500 dark:text-gray-400 text-sm leading-relaxed">
              Administra los accesos y asigna roles como "Atención al Cliente" a los empleados de la organización.
            </p>
            <div class="mt-4">
              <a routerLink="/usuarios" class="text-blue-600 dark:text-blue-400 font-bold hover:underline">Gestionar Usuarios &rarr;</a>
            </div>
          </div>
        }
        <!-- Sección Formularios (Admin) -->
        @if (authService.hasRole('ADMINISTRADOR')) {
          <div class="bg-white dark:bg-gray-700 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-600">
            <div class="flex items-center">
              <div class="p-3 bg-orange-100 dark:bg-orange-900/50 rounded-lg">
                <svg fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" viewBox="0 0 24 24" class="w-8 h-8 text-orange-600 dark:text-orange-400"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"></path></svg>
              </div>
              <h2 class="ms-3 text-xl font-semibold text-gray-900 dark:text-gray-100">Formularios</h2>
            </div>
            <p class="mt-4 text-gray-500 dark:text-gray-400 text-sm leading-relaxed">
              Diseña formularios dinámicos con campos personalizados (texto, listas, fechas, archivos y más) y guarda su estructura en JSON.
            </p>
            <div class="mt-4">
              <a routerLink="/formularios" class="text-orange-600 dark:text-orange-400 font-bold hover:underline">Gestionar Formularios &rarr;</a>
            </div>
          </div>
        }
      </div>
    </div>
  `
})
export class DashboardComponent {
  authService = inject(AuthService);
}

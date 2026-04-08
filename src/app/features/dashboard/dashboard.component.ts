import { Component, inject } from '@angular/core';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  template: `
    <div class="bg-white dark:bg-gray-800 overflow-hidden shadow-xl sm:rounded-lg">
      <div class="p-6 sm:px-20 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div class="mt-8 text-2xl font-bold dark:text-gray-100">
          Bienvenido al Dashboard, {{ authService.currentUser()?.username }}!
        </div>

        <div class="mt-6 text-gray-500 dark:text-gray-400">
          Esta es la vista principal de tu aplicación de negocio. Desde aquí puedes
          acceder al diseñador de diagramas GoJS seleccionando "Políticas" en el menú superior.
        </div>
      </div>

      <div class="bg-gray-200 dark:bg-gray-800 bg-opacity-25 grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8 p-6 lg:p-8">
        <div>
          <div class="flex items-center">
            <svg fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" viewBox="0 0 24 24" class="w-8 h-8 text-gray-400"><path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path></svg>
            <h2 class="ms-3 text-xl font-semibold text-gray-900 dark:text-gray-100">
              Gestión de Políticas
            </h2>
          </div>
          <p class="mt-4 text-gray-500 dark:text-gray-400 text-sm leading-relaxed">
            Navega a la sección de políticas para dibujar modelos relacionales Swimlane en tiempo real con GoJS. El sistema está sincronizado vía WebSockets.
          </p>
        </div>
      </div>
    </div>
  `
})
export class DashboardComponent {
  authService = inject(AuthService);
}

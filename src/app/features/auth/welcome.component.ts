import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-welcome',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="relative flex items-top justify-center min-h-screen bg-gray-100 dark:bg-gray-900 sm:items-center py-4 sm:pt-0">
      <div class="max-w-6xl mx-auto sm:px-6 lg:px-8 text-center">
        <h1 class="text-4xl font-extrabold text-gray-900 dark:text-white sm:text-5xl md:text-6xl mb-6">
          <span class="block">PolicyBusiness</span>
          <span class="block text-indigo-600 dark:text-indigo-400 text-3xl mt-2">Diagramador de Políticas Empresariales</span>
        </h1>
        
        <p class="mt-3 max-w-md mx-auto text-base text-gray-500 dark:text-gray-400 sm:text-lg md:mt-5 md:text-xl md:max-w-3xl mb-8">
          Estandariza, diseña y colabora en los procesos clave de tu organización. 
          Un lienzo infinito con sincronización en tiempo real.
        </p>
        
        <div class="mt-5 max-w-md mx-auto sm:flex sm:justify-center md:mt-8">
          <div class="rounded-md shadow">
            <a routerLink="/login" class="w-full flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 md:py-4 md:text-lg md:px-10 transition">
              Iniciar Sesión
            </a>
          </div>
          <div class="mt-3 rounded-md shadow sm:mt-0 sm:ms-3">
            <a routerLink="/register" class="w-full flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-indigo-600 bg-white hover:bg-gray-50 md:py-4 md:text-lg md:px-10 transition">
              Registrarse
            </a>
          </div>
        </div>
      </div>
    </div>
  `
})
export class WelcomeComponent {}

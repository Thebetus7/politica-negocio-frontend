import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { DocumentoService, DocumentoUploadResponse } from '../../../../core/services/documento.service';
import { AuthService } from '../../../../core/services/auth.service';

@Component({
  selector: 'app-documento-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="max-w-6xl mx-auto p-6">
      <!-- Encabezado -->
      <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 class="text-3xl font-bold text-gray-900 dark:text-gray-100 font-sans tracking-tight">Gestor de Documentos</h1>
          <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">Aprobación, control de versiones y edición colaborativa de archivos cargados.</p>
        </div>
      </div>

      <!-- Filtros y Búsqueda -->
      <div class="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-700 mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <!-- Tabs (Switch de Estado) -->
        <div class="flex bg-gray-100 dark:bg-gray-700/50 p-1 rounded-xl">
          <button (click)="cambiarFiltro('PENDIENTE')" 
            [class.bg-white]="estadoFiltro() === 'PENDIENTE'"
            [class.shadow-sm]="estadoFiltro() === 'PENDIENTE'"
            [class.dark:bg-gray-800]="estadoFiltro() === 'PENDIENTE'"
            [class.text-indigo-650]="estadoFiltro() === 'PENDIENTE'"
            [class.text-gray-500]="estadoFiltro() !== 'PENDIENTE'"
            class="px-4 py-2 text-sm font-semibold rounded-lg transition-all duration-200">
            ⏳ Por Aprobar
          </button>
          <button (click)="cambiarFiltro('ACEPTADO')" 
            [class.bg-white]="estadoFiltro() === 'ACEPTADO'"
            [class.shadow-sm]="estadoFiltro() === 'ACEPTADO'"
            [class.dark:bg-gray-800]="estadoFiltro() === 'ACEPTADO'"
            [class.text-indigo-650]="estadoFiltro() === 'ACEPTADO'"
            [class.text-gray-500]="estadoFiltro() !== 'ACEPTADO'"
            class="px-4 py-2 text-sm font-semibold rounded-lg transition-all duration-200">
            ✅ Aceptados / Editables
          </button>
          <button (click)="cambiarFiltro('RECHAZADO')" 
            [class.bg-white]="estadoFiltro() === 'RECHAZADO'"
            [class.shadow-sm]="estadoFiltro() === 'RECHAZADO'"
            [class.dark:bg-gray-800]="estadoFiltro() === 'RECHAZADO'"
            [class.text-indigo-650]="estadoFiltro() === 'RECHAZADO'"
            [class.text-gray-500]="estadoFiltro() !== 'RECHAZADO'"
            class="px-4 py-2 text-sm font-semibold rounded-lg transition-all duration-200">
            ❌ Rechazados
          </button>
        </div>

        <!-- Buscador -->
        <div class="relative flex-1 md:max-w-md w-full">
          <span class="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">🔍</span>
          <input type="text" [(ngModel)]="busqueda" (ngModelChange)="cargarDocumentos()" 
            placeholder="Buscar documento por nombre..." 
            class="w-full pl-9 pr-4 py-2 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-150 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:outline-none transition text-sm" />
        </div>
      </div>

      <!-- Tabla de Documentos -->
      <div class="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
        @if (loading()) {
          <div class="p-12 text-center text-gray-500">
            <span class="inline-block animate-spin mr-2">⏳</span> Cargando documentos...
          </div>
        } @else if (documentos().length === 0) {
          <div class="p-16 text-center">
            <p class="text-gray-400 text-lg mb-2 font-medium">No se encontraron documentos</p>
            <p class="text-gray-400 text-xs">Los documentos subidos por tareas o cargados se mostrarán en esta lista.</p>
          </div>
        } @else {
          <div class="overflow-x-auto">
            <table class="w-full text-left border-collapse">
              <thead>
                <tr class="bg-gray-50 dark:bg-gray-750 text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-700">
                  <th class="px-6 py-4">Nombre del Documento</th>
                  <th class="px-6 py-4">Tipo</th>
                  <th class="px-6 py-4">Tamaño</th>
                  <th class="px-6 py-4 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 select-none transition-colors" (click)="toggleOrdenFecha()">
                    Fecha de Creación 
                    <span class="ml-1 text-xs">
                      {{ ordenFechaDesc() ? '▼' : '▲' }}
                    </span>
                  </th>
                  <th class="px-6 py-4 text-center">Versión</th>
                  <th class="px-6 py-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-150 dark:divide-gray-700 text-sm text-gray-700 dark:text-gray-200">
                @for (doc of documentos(); track doc.id) {
                  <tr class="hover:bg-gray-50/50 dark:hover:bg-gray-750/30 transition-colors">
                    <td class="px-6 py-4 font-semibold text-gray-900 dark:text-white max-w-xs truncate">
                      {{ doc.nombreOriginal }}
                    </td>
                    <td class="px-6 py-4 text-xs font-mono">
                      {{ obtenerMimeCorto(doc.mimeType) }}
                    </td>
                    <td class="px-6 py-4 text-xs text-gray-500">
                      {{ formatearTamano(doc.size) }}
                    </td>
                    <td class="px-6 py-4 text-xs text-gray-500">
                      13/07/2026 14:50
                    </td>
                    <td class="px-6 py-4 text-center">
                      <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-gray-100 dark:bg-gray-750 text-gray-750 dark:text-gray-300">
                        v{{ doc.versionActual }}
                      </span>
                    </td>
                    <td class="px-6 py-4 text-right space-x-2">
                      <!-- Acciones según el estado actual -->
                      @if (estadoFiltro() === 'PENDIENTE') {
                        @if (auth.isAdmin() || auth.hasRole('FUNCIONARIO')) {
                          <button (click)="aceptar(doc)" 
                            class="px-3 py-1.5 bg-green-50 dark:bg-green-950/40 text-green-700 dark:text-green-400 hover:bg-green-150 dark:hover:bg-green-900/50 rounded-lg text-xs font-bold border border-green-200 dark:border-green-800 transition">
                            Aceptar
                          </button>
                          <button (click)="rechazar(doc)" 
                            class="px-3 py-1.5 bg-red-50 dark:bg-red-950/40 text-red-750 dark:text-red-400 hover:bg-red-150 dark:hover:bg-red-900/50 rounded-lg text-xs font-bold border border-red-200 dark:border-red-800 transition">
                            Rechazar
                          </button>
                        }
                      } @else if (estadoFiltro() === 'ACEPTADO') {
                        <a [routerLink]="['/documentos/editar', doc.id]" target="_blank"
                          class="inline-block px-3 py-1.5 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-650 dark:text-indigo-400 hover:bg-indigo-150 dark:hover:bg-indigo-900/50 rounded-lg text-xs font-bold border border-indigo-200 dark:border-indigo-800 transition">
                          ✏️ Editar (Pestaña)
                        </a>
                        <a [href]="doc.downloadUrl" target="_blank"
                          class="inline-block px-3 py-1.5 bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-150 dark:hover:bg-gray-600 rounded-lg text-xs font-bold border border-gray-200 dark:border-gray-600 transition">
                          💾 Descargar
                        </a>
                      } @else {
                        <button (click)="aceptar(doc)" 
                          class="px-3 py-1.5 bg-green-50 dark:bg-green-950/40 text-green-700 dark:text-green-400 hover:bg-green-150 dark:hover:bg-green-900/50 rounded-lg text-xs font-bold border border-green-200 dark:border-green-800 transition">
                          Re-Aceptar
                        </button>
                      }
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }
      </div>
    </div>
  `,
  styles: []
})
export class DocumentoListComponent implements OnInit {
  documentoService = inject(DocumentoService);
  auth = inject(AuthService);

  documentos = signal<DocumentoUploadResponse[]>([]);
  loading = signal(true);
  estadoFiltro = signal<string>('PENDIENTE');
  ordenFechaDesc = signal<boolean>(true);
  busqueda = '';

  ngOnInit() {
    this.cargarDocumentos();
  }

  cambiarFiltro(nuevoEstado: string) {
    this.estadoFiltro.set(nuevoEstado);
    this.cargarDocumentos();
  }

  cargarDocumentos() {
    this.loading.set(true);
    this.documentoService.listar(this.busqueda, this.estadoFiltro(), this.ordenFechaDesc()).subscribe({
      next: (data) => {
        this.documentos.set(data);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
      }
    });
  }

  toggleOrdenFecha() {
    this.ordenFechaDesc.update(v => !v);
    this.cargarDocumentos();
  }

  aceptar(doc: DocumentoUploadResponse) {
    this.documentoService.cambiarEstado(doc.id, 'ACEPTADO').subscribe(() => {
      this.cargarDocumentos();
    });
  }

  rechazar(doc: DocumentoUploadResponse) {
    this.documentoService.cambiarEstado(doc.id, 'RECHAZADO').subscribe(() => {
      this.cargarDocumentos();
    });
  }

  obtenerMimeCorto(mimeType?: string): string {
    if (!mimeType) return 'FILE';
    if (mimeType.includes('pdf')) return 'PDF';
    if (mimeType.includes('word') || mimeType.includes('officedocument.word')) return 'WORD';
    if (mimeType.includes('excel') || mimeType.includes('officedocument.spread')) return 'EXCEL';
    return mimeType.split('/').pop()?.toUpperCase() || 'FILE';
  }

  formatearTamano(size?: number): string {
    if (!size) return '0 B';
    const k = 1024;
    const dm = 1;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(size) / Math.log(k));
    return parseFloat((size / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  }
}

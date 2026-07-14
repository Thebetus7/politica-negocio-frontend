import { Component, inject, OnInit, OnDestroy, signal, computed, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { DocumentoService, DocumentoUploadResponse } from '../../../../core/services/documento.service';
import { DocumentoSocketService } from '../../../../core/services/documento-socket.service';
import { AuthService } from '../../../../core/services/auth.service';

declare var Quill: any;

interface CursorRemoto {
  userId: string;
  nombre: string;
  position: number;
  color: string;
  lastActive: number;
}

@Component({
  selector: 'app-documento-editor',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="max-w-7xl mx-auto p-4 md:p-6">
      <!-- Barra superior -->
      <div class="flex justify-between items-center mb-6">
        <div class="flex items-center gap-3">
          <a routerLink="/documentos" class="p-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 rounded-xl transition text-sm">
            ← Volver
          </a>
          <div>
            <h1 class="text-2xl font-bold text-gray-900 dark:text-gray-100 font-sans tracking-tight">
              {{ documento()?.nombreOriginal || 'Editor de Documento' }}
            </h1>
            <p class="text-xs text-gray-500 mt-0.5">Editando versión actual: v{{ documento()?.versionActual }}</p>
          </div>
        </div>
        <div class="flex items-center gap-3">
          <!-- Colaboradores activos -->
          <div class="hidden md:flex items-center gap-1.5 bg-gray-50 dark:bg-gray-800 p-2 rounded-xl border border-gray-100 dark:border-gray-700">
            <span class="text-xs text-gray-400 font-medium">Activos:</span>
            <div class="flex -space-x-2">
              @for (c of listaColaboradores(); track c.userId) {
                <div [style.backgroundColor]="c.color" 
                  [title]="c.nombre"
                  class="h-7 w-7 rounded-full flex items-center justify-center font-bold text-white border-2 border-white dark:border-gray-800 text-xs shadow-sm cursor-help">
                  {{ c.nombre.charAt(0).toUpperCase() }}
                </div>
              } @empty {
                <span class="text-xs text-gray-400 italic">Solo tú</span>
              }
            </div>
          </div>
          <button (click)="guardarManual()" 
            class="px-4 py-2 bg-indigo-650 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold transition shadow-sm">
            💾 Guardar Borrador
          </button>
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <!-- Editor de Texto Principal -->
        <div class="lg:col-span-3 flex flex-col bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden shadow-sm">
          <!-- Barra de Herramientas del Editor -->
          <div class="p-3 bg-gray-50 dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 flex items-center gap-2">
            <span class="text-xs text-gray-400 font-semibold uppercase tracking-wider px-2">Editor Colaborativo</span>
            @if (savingBorrador()) {
              <span class="text-xs text-indigo-600 dark:text-indigo-400 animate-pulse font-medium">Guardando cambios...</span>
            } @else {
              <span class="text-xs text-green-600 dark:text-green-400 font-medium">Sincronizado</span>
            }
          </div>
          
          <!-- Contenedor del Editor Quill -->
          <div class="relative flex-1 p-2 bg-white dark:bg-gray-800">
            <div #editorContainer class="min-h-[500px] text-gray-800 dark:text-gray-200"></div>
          </div>
        </div>

        <!-- Panel Lateral Derecha: Control de Versiones -->
        <div class="flex flex-col gap-6">
          <!-- Crear Versión Manual -->
          <div class="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-100 dark:border-gray-700 shadow-sm">
            <h3 class="font-bold text-gray-900 dark:text-gray-100 text-sm mb-3">Crear Nueva Versión</h3>
            <div class="space-y-3">
              <textarea [(ngModel)]="comentarioVersion" placeholder="Describe qué cambios hiciste..." rows="2"
                class="w-full p-2.5 text-sm rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-150 focus:ring-2 focus:ring-indigo-500 focus:outline-none transition"></textarea>
              <button (click)="guardarVersionNueva()" [disabled]="creatingVersion() || !comentarioVersion.trim()"
                class="w-full py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition shadow-sm">
                {{ creatingVersion() ? 'Creando versión...' : '🚀 Guardar Nueva Versión' }}
              </button>
            </div>
          </div>

          <!-- Historial de Versiones -->
          <div class="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-100 dark:border-gray-700 shadow-sm flex-1 flex flex-col max-h-[400px]">
            <h3 class="font-bold text-gray-900 dark:text-gray-100 text-sm mb-3 border-b border-gray-100 dark:border-gray-700 pb-2">Historial de Versiones</h3>
            <div class="overflow-y-auto flex-1 space-y-3 pr-1">
              @for (v of versiones(); track v.id) {
                <div class="p-3 bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100/50 dark:hover:bg-gray-700 rounded-xl border border-gray-100 dark:border-gray-700 transition">
                  <div class="flex justify-between items-center gap-2 mb-1">
                    <span class="text-xs font-bold text-indigo-650 dark:text-indigo-400">Versión v{{ v.version }}</span>
                    <span class="text-[10px] text-gray-400">{{ formatearFecha(v.createdAt) }}</span>
                  </div>
                  <p class="text-xs text-gray-700 dark:text-gray-300 font-semibold mb-2 italic">"{{ v.comentario }}"</p>
                  <div class="flex justify-between items-center mt-2 pt-2 border-t border-dashed border-gray-200 dark:border-gray-700">
                    <span class="text-[10px] text-gray-400 font-medium">Por: {{ v.modificadoPor }}</span>
                    <button (click)="revertir(v.id)" 
                      class="px-2 py-1 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/50 rounded text-[10px] font-bold border border-amber-200 dark:border-amber-800 transition">
                      Restaurar
                    </button>
                  </div>
                </div>
              } @empty {
                <p class="text-xs text-gray-400 italic text-center py-6">Solo la versión inicial disponible.</p>
              }
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host ::ng-deep .ql-toolbar.ql-snow {
      border: none !important;
      border-bottom: 1px solid rgba(229, 231, 235, 1) !important;
      background-color: #f9fafb;
    }
    :host ::ng-deep .ql-container.ql-snow {
      border: none !important;
      font-family: inherit;
    }
    :host ::ng-deep .ql-editor {
      min-height: 500px;
      font-size: 1rem;
      line-height: 1.625;
    }
    :host ::ng-deep .ql-editor img {
      max-width: 100%;
      height: auto;
      border-radius: 8px;
      margin: 12px 0;
      box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
    }
    /* Dark Mode Quill styling */
    :host ::ng-deep .dark .ql-toolbar.ql-snow {
      background-color: #1f2937;
      border-bottom: 1px solid #374151 !important;
    }
    :host ::ng-deep .dark .ql-container.ql-snow {
      background-color: #1f2937 !important;
      color: #f3f4f6 !important;
      border: none !important;
    }
    :host ::ng-deep .dark .ql-editor {
      background-color: #1f2937 !important;
      color: #f3f4f6 !important;
    }
    :host ::ng-deep .dark .ql-stroke {
      stroke: #d1d5db !important;
    }
    :host ::ng-deep .dark .ql-fill {
      fill: #d1d5db !important;
    }
    :host ::ng-deep .dark .ql-picker {
      color: #d1d5db !important;
    }
    :host ::ng-deep .dark .ql-picker-options {
      background-color: #1f2937 !important;
      border: 1px solid #374151 !important;
    }
  `]
})
export class DocumentoEditorComponent implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild('editorContainer') editorContainer!: ElementRef<HTMLDivElement>;

  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private documentoService = inject(DocumentoService);
  private socketService = inject(DocumentoSocketService);
  private auth = inject(AuthService);

  documento = signal<DocumentoUploadResponse | null>(null);
  texto = '';
  comentarioVersion = '';
  versiones = signal<any[]>([]);
  colaboradores = signal<Record<string, CursorRemoto>>({});
  
  savingBorrador = signal(false);
  creatingVersion = signal(false);

  private quill: any;
  private isUpdatingFromSocket = false;

  private socketTextSub?: Subscription;
  private socketCursorSub?: Subscription;
  private currentUserId = '';
  private currentUserName = '';
  private userColor = '';
  private debounceTimer: any;
  private cleanupTimer: any;

  listaColaboradores = computed(() => {
    return Object.values(this.colaboradores()).filter(c => Date.now() - c.lastActive < 10000); // Activos en últimos 10s
  });

  ngOnInit() {
    this.currentUserId = this.auth.currentUser()?.id || 'anonimo';
    this.currentUserName = this.auth.currentUser()?.nombre || 'Anónimo';
    this.userColor = this.generarColorAleatorio(this.currentUserId);

    const docId = this.route.snapshot.paramMap.get('id');
    if (!docId) {
      this.router.navigate(['/documentos']);
      return;
    }

    this.cargarDatosDocumento(docId);
    this.cargarVersiones(docId);

    // Conectar WebSocket
    this.socketService.connectToDocument(docId);

    // Escuchar actualizaciones de texto remotas
    this.socketTextSub = this.socketService.getDocumentUpdates().subscribe((msg: any) => {
      // Ignorar si el cambio es nuestro
      if (msg.usuarioId === this.currentUserId) return;

      this.texto = msg.contenido;
      if (this.quill) {
        this.isUpdatingFromSocket = true;
        const range = this.quill.getSelection();
        this.quill.root.innerHTML = this.texto;
        if (range) {
          setTimeout(() => {
            this.quill.setSelection(range.index, range.length);
          });
        }
        this.isUpdatingFromSocket = false;
      }
    });

    // Escuchar actualizaciones de cursores remotos
    this.socketCursorSub = this.socketService.getCursorUpdates().subscribe((msg: any) => {
      if (msg.userId === this.currentUserId) return;
      
      this.colaboradores.update(map => {
        const nuevoMap = { ...map };
        nuevoMap[msg.userId] = {
          userId: msg.userId,
          nombre: msg.nombre,
          position: msg.position,
          color: msg.color,
          lastActive: Date.now()
        };
        return nuevoMap;
      });
    });

    // Limpiador periódico de colaboradores inactivos
    this.cleanupTimer = setInterval(() => {
      this.colaboradores.update(map => {
        const nuevoMap = { ...map };
        const ahora = Date.now();
        for (const [key, c] of Object.entries(nuevoMap)) {
          if (ahora - c.lastActive > 15000) {
            delete nuevoMap[key];
          }
        }
        return nuevoMap;
      });
    }, 5000);
  }

  ngAfterViewInit() {
    // Inicializar Quill
    this.quill = new Quill(this.editorContainer.nativeElement, {
      theme: 'snow',
      modules: {
        toolbar: [
          [{ header: [1, 2, 3, false] }],
          ['bold', 'italic', 'underline', 'strike'],
          [{ list: 'ordered' }, { list: 'bullet' }],
          ['image', 'code-block', 'clean']
        ]
      }
    });

    // Cargar contenido inicial en Quill
    if (this.texto) {
      this.isUpdatingFromSocket = true;
      this.quill.root.innerHTML = this.texto;
      this.isUpdatingFromSocket = false;
    }

    // Escuchar cambios de Quill
    this.quill.on('text-change', (delta: any, oldDelta: any, source: string) => {
      if (source === 'user' && !this.isUpdatingFromSocket) {
        this.texto = this.quill.root.innerHTML;
        this.onTextChange();
      }
    });

    // Escuchar cambios de cursor/selección
    this.quill.on('selection-change', (range: any, oldRange: any, source: string) => {
      if (range && source === 'user') {
        this.sendCursor();
      }
    });
  }

  ngOnDestroy() {
    this.socketTextSub?.unsubscribe();
    this.socketCursorSub?.unsubscribe();
    this.socketService.disconnect();
    if (this.cleanupTimer) clearInterval(this.cleanupTimer);
  }

  cargarDatosDocumento(id: string) {
    this.documentoService.getById(id).subscribe({
      next: (doc) => {
        this.documento.set(doc);
        this.texto = doc.contenidoTexto || '';
        if (this.quill) {
          this.isUpdatingFromSocket = true;
          this.quill.root.innerHTML = this.texto;
          this.isUpdatingFromSocket = false;
        }
      },
      error: () => {
        this.router.navigate(['/documentos']);
      }
    });
  }

  cargarVersiones(id: string) {
    this.documentoService.obtenerVersiones(id).subscribe({
      next: (data) => {
        this.versiones.set(data);
      }
    });
  }

  onTextChange() {
    this.savingBorrador.set(true);
    // 1. Sincronizar vía WebSocket
    this.socketService.sendDocumentUpdate({
      usuarioId: this.currentUserId,
      contenido: this.texto
    });

    // 2. Guardar en base de datos con debounce de 1s
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => {
      const doc = this.documento();
      if (!doc) return;
      this.documentoService.actualizarContenido(doc.id, this.texto).subscribe({
        next: () => {
          this.savingBorrador.set(false);
        },
        error: () => {
          this.savingBorrador.set(false);
        }
      });
    }, 1000);
  }

  sendCursor() {
    if (!this.quill) return;
    const range = this.quill.getSelection();
    if (!range) return;
    this.socketService.sendCursorPosition({
      userId: this.currentUserId,
      nombre: this.currentUserName,
      position: range.index,
      color: this.userColor
    });
  }

  guardarManual() {
    const doc = this.documento();
    if (!doc) return;
    this.savingBorrador.set(true);
    this.documentoService.actualizarContenido(doc.id, this.texto).subscribe({
      next: (res) => {
        this.documento.set(res);
        this.savingBorrador.set(false);
        alert('Borrador guardado con éxito.');
      },
      error: () => {
        this.savingBorrador.set(false);
        alert('Error al guardar el borrador.');
      }
    });
  }

  guardarVersionNueva() {
    const doc = this.documento();
    if (!doc || !this.comentarioVersion.trim()) return;

    this.creatingVersion.set(true);
    this.documentoService.actualizarContenido(doc.id, this.texto).subscribe({
      next: () => {
        this.documentoService.crearVersion(doc.id, this.comentarioVersion).subscribe({
          next: (v) => {
            this.creatingVersion.set(false);
            this.comentarioVersion = '';
            this.cargarDatosDocumento(doc.id);
            this.cargarVersiones(doc.id);
            alert(`Versión v${v.version} creada con éxito.`);
          },
          error: () => {
            this.creatingVersion.set(false);
            alert('Error al crear la versión.');
          }
        });
      },
      error: () => {
        this.creatingVersion.set(false);
        alert('Error al guardar borrador antes de versionar.');
      }
    });
  }

  revertir(versionId: string) {
    const doc = this.documento();
    if (!doc) return;

    if (confirm('¿Estás seguro de que deseas restaurar el contenido a esta versión anterior? Esto creará una versión nueva del historial.')) {
      this.documentoService.revertirVersion(doc.id, versionId).subscribe({
        next: (res) => {
          this.documento.set(res);
          this.texto = res.contenidoTexto || '';
          if (this.quill) {
            this.isUpdatingFromSocket = true;
            this.quill.root.innerHTML = this.texto;
            this.isUpdatingFromSocket = false;
          }
          this.cargarVersiones(doc.id);
          this.socketService.sendDocumentUpdate({
            usuarioId: this.currentUserId,
            contenido: this.texto
          });
          alert('Documento restaurado correctamente.');
        },
        error: (err) => {
          alert('Error al restaurar la versión: ' + (err.error?.message || err.message));
        }
      });
    }
  }

  formatearFecha(fechaStr?: string): string {
    if (!fechaStr) return '';
    try {
      const d = new Date(fechaStr);
      return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return fechaStr;
    }
  }

  private generarColorAleatorio(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const colors = [
      '#4f46e5', '#0284c7', '#0d9488', '#059669', 
      '#ca8a04', '#ea580c', '#e11d48', '#7c3aed', '#db2777'
    ];
    const index = Math.abs(hash) % colors.length;
    return colors[index];
  }
}

import { Component, Input, OnInit, OnChanges, SimpleChanges, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { DocumentoService, DocumentoUploadResponse } from '../../../../core/services/documento.service';

@Component({
  selector: 'app-politica-documentos-list',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="p-4 bg-gray-800/40 dark:bg-gray-900/40 rounded-xl border border-gray-700/60 flex flex-col text-gray-250 w-full relative">
      <!-- Encabezado del Panel -->
      <div class="flex justify-between items-center pb-2 border-b border-gray-700/80 mb-3">
        <h3 class="text-xs font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-1.5">
          <span>📁</span> Documentos Aceptados
        </h3>
        <button (click)="cargarDocumentos()" class="text-gray-400 hover:text-white transition-colors" title="Refrescar lista">
          🔄
        </button>
      </div>

      <!-- Lista de Documentos -->
      <div class="flex-1 overflow-y-auto space-y-2.5 max-h-[220px] pr-1">
        @if (loading()) {
          <div class="text-center py-6 text-[11px] text-gray-500">
            Cargando archivos asociados...
          </div>
        } @else if (documentos().length === 0) {
          <div class="text-center py-8 text-[11px] text-gray-500 italic">
            No hay documentos aprobados para esta actividad.
          </div>
        } @else {
          @for (doc of documentos(); track doc.id) {
            <div class="p-2.5 bg-gray-800/85 dark:bg-gray-850/90 rounded-lg border border-gray-700/70 hover:border-gray-650 transition-all duration-200">
              <div class="font-semibold text-xs text-white truncate" [title]="doc.nombreOriginal">
                {{ doc.nombreOriginal }}
              </div>
              <div class="flex items-center justify-between mt-1.5 text-[10px] text-gray-400">
                <span>v{{ doc.versionActual }}</span>
                <span>{{ obtenerMimeCorto(doc.mimeType) }}</span>
              </div>
              
              <!-- Botones de Acción rápidos -->
              <div class="flex gap-1.5 mt-2.5 pt-2 border-t border-gray-700/40">
                <a [routerLink]="['/documentos/editar', doc.id]" target="_blank"
                  class="flex-1 text-center py-1 bg-indigo-600/35 hover:bg-indigo-650/50 text-indigo-350 rounded text-[9px] font-bold border border-indigo-700/40 transition">
                  ✏️ Editar
                </a>
                <a [href]="doc.downloadUrl" target="_blank"
                  class="flex-1 text-center py-1 bg-gray-700 hover:bg-gray-650 text-gray-250 rounded text-[9px] font-bold border border-gray-600 transition">
                  💾 Descargar
                </a>
                <button type="button" (click)="pedirConfirmacionEliminar(doc)"
                  class="px-2 py-1 bg-red-900/40 hover:bg-red-800/60 text-red-300 rounded text-[9px] font-bold border border-red-700/40 transition"
                  title="Eliminar documento">
                  🗑️
                </button>
              </div>
            </div>
          }
        }
      </div>

      <!-- Modal de Advertencia de Eliminación -->
      @if (documentoParaEliminar(); as doc) {
        <div class="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div class="fixed inset-0 bg-black/70 backdrop-blur-sm animate-fade-in" (click)="cancelarEliminar()"></div>
          <div class="relative bg-gray-900 border border-gray-700 rounded-xl p-5 max-w-sm w-full shadow-2xl text-left border border-red-900/40">
            <h4 class="text-sm font-bold text-red-400 flex items-center gap-1.5 mb-2">
              ⚠️ Eliminar Documento
            </h4>
            <p class="text-xs text-gray-300 leading-relaxed mb-4">
              ¿Estás seguro de que deseas eliminar el documento <strong class="text-white">"{{ doc.nombreOriginal }}"</strong>? Esta acción lo quitará lógicamente de esta actividad y de todo el flujo.
            </p>
            <div class="flex justify-end gap-2">
              <button type="button" (click)="cancelarEliminar()" 
                      class="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-350 rounded text-xs font-semibold border border-gray-700 transition">
                Cancelar
              </button>
              <button type="button" (click)="confirmarEliminar(doc.id)" 
                      class="px-3 py-1.5 bg-red-650 hover:bg-red-600 text-white rounded text-xs font-semibold transition">
                Sí, eliminar
              </button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
    }
    div::-webkit-scrollbar {
      width: 4px;
    }
    div::-webkit-scrollbar-thumb {
      background-color: rgba(148, 163, 184, 0.3);
      border-radius: 9999px;
    }
    .animate-fade-in {
      animation: fadeIn 0.2s ease-out;
    }
    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
  `]
})
export class PoliticaDocumentosListComponent implements OnInit, OnChanges {
  @Input() politicaId!: string;
  @Input() actividadId?: string;

  private documentoService = inject(DocumentoService);
  documentos = signal<DocumentoUploadResponse[]>([]);
  loading = signal(true);

  // Control de modal de advertencia
  documentoParaEliminar = signal<DocumentoUploadResponse | null>(null);

  ngOnInit() {
    this.cargarDocumentos();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['actividadId'] || changes['politicaId']) {
      this.cargarDocumentos();
    }
  }

  cargarDocumentos() {
    if (!this.politicaId) return;
    this.loading.set(true);
    this.documentoService.listarPorPolitica(this.politicaId).subscribe({
      next: (data) => {
        let filtrados = data;
        if (this.actividadId) {
          filtrados = data.filter(doc => doc.actividadId === this.actividadId);
        }
        this.documentos.set(filtrados);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
      }
    });
  }

  pedirConfirmacionEliminar(doc: DocumentoUploadResponse) {
    this.documentoParaEliminar.set(doc);
  }

  cancelarEliminar() {
    this.documentoParaEliminar.set(null);
  }

  confirmarEliminar(id: string) {
    this.documentoService.eliminar(id).subscribe({
      next: () => {
        // Eliminar del listado del frontend localmente
        this.documentos.update(list => list.filter(doc => doc.id !== id));
        this.cancelarEliminar();
      },
      error: (err) => {
        console.error('Error al eliminar documento:', err);
        this.cancelarEliminar();
      }
    });
  }

  obtenerMimeCorto(mimeType?: string): string {
    if (!mimeType) return 'FILE';
    if (mimeType.includes('pdf')) return 'PDF';
    if (mimeType.includes('word') || mimeType.includes('officedocument.word')) return 'WORD';
    if (mimeType.includes('excel') || mimeType.includes('officedocument.spread')) return 'EXCEL';
    return mimeType.split('/').pop()?.toUpperCase() || 'FILE';
  }
}

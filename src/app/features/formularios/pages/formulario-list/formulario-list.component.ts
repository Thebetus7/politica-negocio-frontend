import { Component, inject, signal, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SlicePipe } from '@angular/common';
import { FormularioService, Formulario, CampoFormulario } from '../../../../core/services/formulario.service';

type TipoCampo = CampoFormulario['tipo'];

@Component({
  selector: 'app-formulario-list',
  standalone: true,
  imports: [FormsModule, SlicePipe],
  template: `
<div class="space-y-6">
  <!-- Encabezado -->
  <div class="flex justify-between items-center">
    <div>
      <h2 class="text-2xl font-bold text-gray-900 dark:text-white">Formularios</h2>
      <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">Diseña y administra formularios dinámicos.</p>
    </div>
    <button (click)="abrirCrear()" class="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg shadow transition-all active:scale-95">
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
      Crear Formulario
    </button>
  </div>

  <!-- Tabla -->
  <div class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
    <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
      <thead class="bg-gray-50 dark:bg-gray-700/50">
        <tr>
          <th class="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Nombre</th>
          <th class="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Descripción</th>
          <th class="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Campos</th>
          <th class="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Creado</th>
          <th class="px-6 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Acciones</th>
        </tr>
      </thead>
      <tbody class="divide-y divide-gray-100 dark:divide-gray-700 bg-white dark:bg-gray-800">
        @if (svc.loading()) {
          <tr><td colspan="5" class="px-6 py-10 text-center text-gray-400 text-sm">Cargando...</td></tr>
        } @else if (svc.formularios().length === 0) {
          <tr><td colspan="5" class="px-6 py-10 text-center text-gray-400 text-sm">No hay formularios. ¡Crea el primero!</td></tr>
        } @else {
          @for (f of svc.formularios(); track f.id) {
            <tr class="hover:bg-gray-50 dark:hover:bg-gray-700/40 transition-colors">
              <td class="px-6 py-4 text-sm font-semibold text-gray-900 dark:text-white">{{ f.nombre }}</td>
              <td class="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">{{ f.descripcion || '—' }}</td>
              <td class="px-6 py-4">
                <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800 dark:bg-indigo-900/50 dark:text-indigo-300">
                  {{ f.campos?.length || 0 }} campo(s)
                </span>
              </td>
              <td class="px-6 py-4 text-sm text-gray-400">{{ f.createdAt | slice:0:10 }}</td>
              <td class="px-6 py-4 text-right">
                <div class="inline-flex items-center gap-1">
                  <button (click)="abrirEditar(f)" title="Editar"
                    class="p-2 rounded-lg text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-colors">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                  </button>
                  <button (click)="eliminar(f)" title="Eliminar"
                    class="p-2 rounded-lg text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                  </button>
                </div>
              </td>
            </tr>
          }
        }
      </tbody>
    </table>
  </div>
</div>

<!-- ===================== MODAL BUILDER ===================== -->
@if (modalAbierto()) {
<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
  <div class="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col border border-gray-200 dark:border-gray-700">

    <!-- Header -->
    <div class="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
      <h3 class="text-lg font-bold text-gray-900 dark:text-white">{{ modoEdicion() ? 'Editar' : 'Crear' }} Formulario</h3>
      <button (click)="cerrarModal()" class="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 transition">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
      </button>
    </div>

    <!-- Body scrolleable -->
    <div class="flex-1 overflow-y-auto p-6 space-y-5">

      <!-- Nombre y descripción -->
      <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label class="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">Nombre *</label>
          <input [(ngModel)]="formNombre" type="text" placeholder="Ej: Solicitud de Crédito"
            class="frm-input">
        </div>
        <div>
          <label class="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">Descripción</label>
          <input [(ngModel)]="formDescripcion" type="text" placeholder="Descripción breve..."
            class="frm-input">
        </div>
      </div>

      <!-- Botón añadir componente -->
      <div class="relative">
        <button (click)="toggleMenu()" class="w-full flex items-center justify-center gap-2 py-2.5 border-2 border-dashed border-indigo-300 dark:border-indigo-700 rounded-xl text-indigo-600 dark:text-indigo-400 text-sm font-semibold hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-all">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
          Añadir componente
        </button>
        @if (menuAbierto()) {
          <div class="absolute left-0 right-0 top-full mt-1 z-10 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg p-2 grid grid-cols-4 gap-1">
            @for (t of tiposDisponibles; track t.tipo) {
              <button (click)="agregarCampo(t.tipo)" class="flex flex-col items-center gap-1 p-2 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition text-center">
                <span class="text-lg">{{ t.icono }}</span>
                <span class="text-[10px] font-semibold text-gray-600 dark:text-gray-400">{{ t.label }}</span>
              </button>
            }
          </div>
        }
      </div>

      <!-- ===== EL FORMULARIO VIVO ===== -->
      @if (camposForm().length === 0) {
        <div class="py-10 text-center text-gray-400 text-sm">
          El formulario está vacío. Añade componentes arriba.
        </div>
      } @else {
        <div class="space-y-4">
          @for (campo of camposForm(); track campo.id; let i = $index) {
            <div class="group relative bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl p-4 hover:border-indigo-300 dark:hover:border-indigo-600 transition-colors">

              <!-- Controles flotantes -->
              <div class="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                @if (i > 0) {
                  <button (click)="moverCampo(i, -1)" title="Subir" class="p-1 rounded text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition">
                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7"/></svg>
                  </button>
                }
                @if (i < camposForm().length - 1) {
                  <button (click)="moverCampo(i, 1)" title="Bajar" class="p-1 rounded text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition">
                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/></svg>
                  </button>
                }
                <button (click)="eliminarCampo(i)" title="Eliminar" class="p-1 rounded text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 transition">
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                </button>
              </div>

              <!-- Etiqueta editable + requerido -->
              <div class="flex items-center gap-2 mb-2">
                <input [(ngModel)]="campo.etiqueta" type="text"
                  class="text-sm font-semibold text-gray-700 dark:text-gray-200 bg-transparent border-none outline-none p-0 w-full focus:ring-0 placeholder-gray-400"
                  placeholder="Etiqueta del campo">
                @if (campo.requerido) {
                  <span class="text-red-500 text-sm">*</span>
                }
                <label class="flex-shrink-0 flex items-center gap-1 cursor-pointer ml-auto">
                  <input type="checkbox" [(ngModel)]="campo.requerido" class="w-3.5 h-3.5 rounded border-gray-300 text-indigo-600">
                  <span class="text-[10px] text-gray-400">Req.</span>
                </label>
              </div>

              <!-- Renderizado REAL del componente según su tipo -->
              @switch (campo.tipo) {
                @case ('texto') {
                  <input type="text" [placeholder]="campo.placeholder || 'Texto...'" class="frm-input">
                }
                @case ('texto_largo') {
                  <textarea [placeholder]="campo.placeholder || 'Escribe aquí...'" rows="3" class="frm-input resize-none"></textarea>
                }
                @case ('numero') {
                  <input type="number" [placeholder]="campo.placeholder || '0'" class="frm-input">
                }
                @case ('fecha') {
                  <input type="date" class="frm-input">
                }
                @case ('lista') {
                  <select class="frm-input">
                    <option value="" disabled selected>Selecciona una opción...</option>
                    @for (opt of campo.opciones; track opt) {
                      <option>{{ opt }}</option>
                    }
                  </select>
                  <!-- Editor de opciones inline -->
                  <div class="mt-2">
                    <input [ngModel]="campo.opciones?.join(', ')"
                      (ngModelChange)="parsearOpciones(campo, $event)"
                      type="text" placeholder="Opciones separadas por coma: Opción A, Opción B, Opción C"
                      class="w-full px-2 py-1 text-xs rounded-lg border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20 text-gray-700 dark:text-amber-200 outline-none focus:border-amber-400">
                  </div>
                }
                @case ('checkbox') {
                  <label class="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" class="w-5 h-5 rounded border-gray-300 text-indigo-600">
                    <span class="text-sm text-gray-600 dark:text-gray-400">{{ campo.etiqueta }}</span>
                  </label>
                }
                @case ('radio') {
                  <div class="space-y-2">
                    @for (opt of campo.opciones; track opt) {
                      <label class="flex items-center gap-2 cursor-pointer">
                        <input type="radio" [name]="campo.id" class="w-4 h-4 border-gray-300 text-indigo-600">
                        <span class="text-sm text-gray-600 dark:text-gray-400">{{ opt }}</span>
                      </label>
                    }
                  </div>
                  <!-- Editor de opciones inline -->
                  <div class="mt-2">
                    <input [ngModel]="campo.opciones?.join(', ')"
                      (ngModelChange)="parsearOpciones(campo, $event)"
                      type="text" placeholder="Opciones: Sí, No, Tal vez"
                      class="w-full px-2 py-1 text-xs rounded-lg border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20 text-gray-700 dark:text-amber-200 outline-none focus:border-amber-400">
                  </div>
                }
              }
            </div>
          }
        </div>
      }
    </div>

    <!-- Footer -->
    <div class="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 rounded-b-2xl">
      <button (click)="cerrarModal()" class="px-4 py-2 text-sm font-semibold text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition">
        Cancelar
      </button>
      <button (click)="guardar()" [disabled]="!formNombre.trim() || guardando()"
        class="inline-flex items-center gap-2 px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-lg shadow transition-all active:scale-95">
        @if (guardando()) {
          <svg class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
        }
        {{ guardando() ? 'Guardando...' : 'Guardar' }}
      </button>
    </div>
  </div>
</div>
}
  `,
  styles: [`
    :host { display: block; }
    .frm-input {
      width: 100%;
      padding: 0.5rem 0.75rem;
      border-radius: 0.5rem;
      border: 1px solid #d1d5db;
      background: white;
      color: #111827;
      font-size: 0.875rem;
      outline: none;
      transition: border-color 0.15s;
    }
    .frm-input:focus { border-color: #6366f1; box-shadow: 0 0 0 2px rgba(99,102,241,0.15); }
    :host-context(.dark) .frm-input {
      border-color: #4b5563;
      background: #1f2937;
      color: #f3f4f6;
    }
    :host-context(.dark) .frm-input:focus { border-color: #818cf8; box-shadow: 0 0 0 2px rgba(129,140,248,0.15); }
  `]
})
export class FormularioListComponent implements OnInit {
  svc = inject(FormularioService);

  modalAbierto = signal(false);
  modoEdicion = signal(false);
  guardando = signal(false);
  editandoId = signal<string | null>(null);
  menuAbierto = signal(false);

  formNombre = '';
  formDescripcion = '';
  camposForm = signal<CampoFormulario[]>([]);

  tiposDisponibles = [
    { tipo: 'texto' as TipoCampo,       label: 'Texto',      icono: '✏️' },
    { tipo: 'texto_largo' as TipoCampo, label: 'Párrafo',    icono: '📄' },
    { tipo: 'numero' as TipoCampo,      label: 'Número',     icono: '🔢' },
    { tipo: 'fecha' as TipoCampo,       label: 'Fecha',      icono: '📅' },
    { tipo: 'lista' as TipoCampo,       label: 'Lista',      icono: '📋' },
    { tipo: 'checkbox' as TipoCampo,    label: 'Checkbox',   icono: '☑️' },
    { tipo: 'radio' as TipoCampo,       label: 'Opciones',   icono: '🔘' },
  ];

  ngOnInit() {
    this.svc.getAll().subscribe();
  }

  toggleMenu() {
    this.menuAbierto.update(v => !v);
  }

  abrirCrear() {
    this.modoEdicion.set(false);
    this.editandoId.set(null);
    this.formNombre = '';
    this.formDescripcion = '';
    this.camposForm.set([]);
    this.menuAbierto.set(false);
    this.modalAbierto.set(true);
  }

  abrirEditar(f: Formulario) {
    this.modoEdicion.set(true);
    this.editandoId.set(f.id!);
    this.formNombre = f.nombre;
    this.formDescripcion = f.descripcion || '';
    this.camposForm.set(JSON.parse(JSON.stringify(f.campos || [])));
    this.menuAbierto.set(false);
    this.modalAbierto.set(true);
  }

  cerrarModal() {
    this.modalAbierto.set(false);
    this.menuAbierto.set(false);
  }

  agregarCampo(tipo: TipoCampo) {
    const nuevo: CampoFormulario = {
      id: crypto.randomUUID(),
      tipo,
      etiqueta: this.getTipoLabel(tipo),
      placeholder: '',
      requerido: false,
      opciones: (tipo === 'lista' || tipo === 'radio') ? ['Opción 1', 'Opción 2'] : undefined,
      orden: this.camposForm().length,
    };
    this.camposForm.update(c => [...c, nuevo]);
    this.menuAbierto.set(false);
  }

  eliminarCampo(index: number) {
    this.camposForm.update(c => c.filter((_, i) => i !== index));
  }

  moverCampo(index: number, dir: number) {
    const arr = [...this.camposForm()];
    const target = index + dir;
    if (target < 0 || target >= arr.length) return;
    [arr[index], arr[target]] = [arr[target], arr[index]];
    this.camposForm.set(arr);
  }

  getTipoLabel(tipo: TipoCampo): string {
    return this.tiposDisponibles.find(t => t.tipo === tipo)?.label ?? tipo;
  }

  guardar() {
    if (!this.formNombre.trim()) return;
    this.guardando.set(true);

    const camposConOrden = this.camposForm().map((c, i) => ({ ...c, orden: i }));

    const payload: Formulario = {
      nombre: this.formNombre.trim(),
      descripcion: this.formDescripcion.trim(),
      campos: camposConOrden,
    };

    const op = this.modoEdicion()
      ? this.svc.update(this.editandoId()!, payload)
      : this.svc.create(payload);

    op.subscribe({
      next: () => { 
        this.guardando.set(false); 
        this.cerrarModal(); 
      },
      error: (err) => { 
        this.guardando.set(false); 
        console.error('Error guardando formulario:', err);
        alert('Ocurrió un error al intentar guardar el formulario. Por favor, revisa la consola para más detalles.');
      }
    });
  }

  eliminar(f: Formulario) {
    if (!confirm(`¿Eliminar el formulario "${f.nombre}"?`)) return;
    this.svc.softDelete(f.id!).subscribe();
  }

  parsearOpciones(campo: CampoFormulario, valor: string) {
    campo.opciones = valor.split(',').map(o => o.trim()).filter(o => !!o);
  }
}

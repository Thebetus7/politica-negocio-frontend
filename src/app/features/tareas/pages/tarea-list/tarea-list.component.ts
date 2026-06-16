import { Component, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { AuthService } from '../../../../core/services/auth.service';
import { PortafolioSocketService } from '../../../../core/services/portafolio-socket.service';
import { TareaService, TareaFuncionario, CompletarActividadPayload } from '../../../../core/services/tarea.service';
import { FormularioService, Formulario } from '../../../../core/services/formulario.service';
import { DocumentoService } from '../../../../core/services/documento.service';
import { VozService } from '../../../../core/services/voz.service';

interface ArchivoEstado {
  nombre?: string;
  subiendo?: boolean;
  error?: string;
}

@Component({
  selector: 'app-tarea-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="max-w-5xl mx-auto p-6">
      <h1 class="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">Mis Tareas Pendientes</h1>
      <p class="text-gray-500 dark:text-gray-400 mb-6">Formularios de actividades asignadas a tu departamento.</p>

      @if (loading()) {
        <p class="text-gray-500">Cargando tareas...</p>
      } @else if (error()) {
        <p class="text-red-600">{{ error() }}</p>
      } @else if (tareas().length === 0) {
        <div class="bg-white dark:bg-gray-800 rounded-xl p-8 text-center border border-gray-200 dark:border-gray-700">
          <p class="text-gray-500">No hay actividades pendientes en tu departamento.</p>
        </div>
      } @else {
        <div class="space-y-4">
          @for (t of tareas(); track t.flujoInstanciaId) {
            <div class="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700 shadow-sm">
              <div class="flex justify-between items-start gap-4">
                <div>
                  <h3 class="font-semibold text-lg text-gray-900 dark:text-gray-100">{{ t.actividadNombre }}</h3>
                  <p class="text-sm text-gray-500 mt-1">Trámite: ...{{ t.portafolioId.slice(-6) }}</p>
                  @if (t.portafolioJson) {
                    <p class="text-sm text-gray-600 dark:text-gray-400 mt-1 italic">Info inicio: {{ t.portafolioJson }}</p>
                  }
                </div>
                <button (click)="abrirTarea(t)" class="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium">
                  Atender
                </button>
              </div>
            </div>
          }
        </div>
      }

      @if (tareaActiva()) {
        <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div class="bg-white dark:bg-gray-800 rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6 shadow-xl">
            <h2 class="text-xl font-bold mb-4 dark:text-gray-100">{{ tareaActiva()!.actividadNombre }}</h2>

            @if (cargandoFormulario()) {
              <p class="text-sm text-gray-500 dark:text-gray-400 mb-6">Cargando formulario...</p>
            } @else if (formulario()) {
              <div class="mb-4 p-3 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-800">
                <p class="text-sm text-indigo-800 dark:text-indigo-200 mb-2">Llenar con voz (un solo audio)</p>
                @if (grabando()) {
                  <button type="button" (click)="detenerGrabacion()"
                    class="px-3 py-1.5 bg-red-600 text-white rounded-lg text-sm">Detener ({{ segundosGrabacion() }}s)</button>
                } @else {
                  <button type="button" (click)="iniciarGrabacion()" [disabled]="procesandoVoz()"
                    class="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-sm disabled:opacity-50">
                    {{ procesandoVoz() ? 'Procesando...' : 'Grabar audio' }}
                  </button>
                }
                @if (vozRazon()) {
                  <p class="text-xs text-gray-600 dark:text-gray-400 mt-2">{{ vozRazon() }}</p>
                }
              </div>

              <div class="space-y-4 mb-6">
                @for (campo of camposVisibles(); track campo.id) {
                  <div>
                    <label class="block text-sm font-medium mb-1 dark:text-gray-200">
                      {{ campo.etiqueta }} @if (campo.requerido) { <span class="text-red-500">*</span> }
                    </label>
                    @switch (campo.tipo) {
                      @case ('texto_largo') {
                        <textarea [(ngModel)]="valores[campo.id]" [placeholder]="campo.placeholder || ''"
                          class="w-full border rounded-lg p-2 dark:bg-gray-700 dark:border-gray-600" rows="3"></textarea>
                      }
                      @case ('numero') {
                        <input type="number" [(ngModel)]="valores[campo.id]" [placeholder]="campo.placeholder || ''"
                          class="w-full border rounded-lg p-2 dark:bg-gray-700 dark:border-gray-600" />
                      }
                      @case ('fecha') {
                        <input type="date" [(ngModel)]="valores[campo.id]"
                          class="w-full border rounded-lg p-2 dark:bg-gray-700 dark:border-gray-600" />
                      }
                      @case ('email') {
                        <input type="email" [(ngModel)]="valores[campo.id]" [placeholder]="campo.placeholder || ''"
                          class="w-full border rounded-lg p-2 dark:bg-gray-700 dark:border-gray-600" />
                      }
                      @case ('checkbox') {
                        @if (campo.opciones?.length) {
                          <div class="space-y-2">
                            @for (op of campo.opciones; track op) {
                              <label class="flex items-center gap-2 dark:text-gray-200">
                                <input
                                  type="checkbox"
                                  [checked]="isCheckboxOptionChecked(campo.id, op)"
                                  (change)="toggleCheckboxOption(campo.id, op, $event)"
                                />
                                {{ op }}
                              </label>
                            }
                          </div>
                        } @else {
                          <input type="checkbox" [(ngModel)]="valores[campo.id]" />
                        }
                      }
                      @case ('lista') {
                        <select [(ngModel)]="valores[campo.id]"
                          class="w-full border rounded-lg p-2 dark:bg-gray-700 dark:border-gray-600">
                          <option value="">Seleccione...</option>
                          @for (op of campo.opciones || []; track op) {
                            <option [value]="op">{{ op }}</option>
                          }
                        </select>
                      }
                      @case ('radio') {
                        <div class="space-y-1">
                          @for (op of campo.opciones || []; track op) {
                            <label class="flex items-center gap-2 dark:text-gray-200">
                              <input type="radio" [name]="campo.id" [(ngModel)]="valores[campo.id]" [value]="op" />
                              {{ op }}
                            </label>
                          }
                        </div>
                      }
                      @case ('tabla') {
                        <div class="overflow-x-auto border border-gray-200 dark:border-gray-750 rounded-lg mt-1 bg-white dark:bg-gray-800">
                          <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700 text-sm">
                            <thead class="bg-gray-50 dark:bg-gray-750">
                              <tr>
                                @for (col of campo.opciones || []; track col) {
                                  <th class="px-3 py-2 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">{{ col }}</th>
                                }
                                <th class="px-3 py-2 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 w-16">Acción</th>
                              </tr>
                            </thead>
                            <tbody class="divide-y divide-gray-200 dark:divide-gray-700">
                              @for (fila of getTablaFilas(campo.id); track $index; let filaIndex = $index) {
                                <tr>
                                  @for (col of campo.opciones || []; track col) {
                                    <td class="px-3 py-2">
                                      <input
                                        type="text"
                                        [(ngModel)]="fila[col]"
                                        class="w-full text-sm border-gray-300 dark:border-gray-600 rounded bg-transparent dark:text-white py-1 px-2 focus:ring-indigo-500 focus:border-indigo-500"
                                      />
                                    </td>
                                  }
                                  <td class="px-3 py-2 text-right">
                                    <button
                                      type="button"
                                      (click)="eliminarFilaTabla(campo.id, filaIndex)"
                                      class="text-red-650 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 text-sm font-medium">
                                      ✕
                                    </button>
                                  </td>
                                </tr>
                              }
                              @if (getTablaFilas(campo.id).length === 0) {
                                <tr>
                                  <td [attr.colspan]="(campo.opciones?.length || 0) + 1" class="px-3 py-4 text-center text-xs text-gray-500 dark:text-gray-400">
                                    No hay filas añadidas.
                                  </td>
                                </tr>
                              }
                            </tbody>
                          </table>
                        </div>
                        <div class="mt-2 flex justify-end">
                          <button
                            type="button"
                            (click)="agregarFilaTabla(campo.id, campo.opciones)"
                            class="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 rounded-lg text-xs font-semibold border border-indigo-200 dark:border-indigo-800 transition-colors">
                            ➕ Añadir fila
                          </button>
                        </div>
                      }
                      @case ('archivo') {
                        <div class="space-y-2">
                          <input type="file" [accept]="campo.placeholder || '*/*'"
                            (change)="onArchivoSeleccionado($event, campo.id)"
                            class="w-full text-sm" />
                          @if (archivoEstado[campo.id]?.subiendo) {
                            <p class="text-sm text-blue-600">Subiendo...</p>
                          }
                          @if (archivoEstado[campo.id]?.nombre) {
                            <p class="text-sm text-green-700 dark:text-green-400">
                              {{ archivoEstado[campo.id]?.nombre }}
                              @if (valores[campo.id]) {
                                <a [href]="docUrl(campo.id)" target="_blank"
                                  class="ml-2 text-indigo-600 underline">Ver</a>
                              }
                            </p>
                          }
                          @if (archivoEstado[campo.id]?.error) {
                            <p class="text-sm text-red-600">{{ archivoEstado[campo.id]?.error }}</p>
                          }
                        </div>
                      }
                      @default {
                        <input type="text" [(ngModel)]="valores[campo.id]" [placeholder]="campo.placeholder || ''"
                          class="w-full border rounded-lg p-2 dark:bg-gray-700 dark:border-gray-600" />
                      }
                    }
                  </div>
                } @empty {
                  <p class="text-sm text-gray-500 dark:text-gray-400">Este formulario no tiene campos para completar.</p>
                }
              </div>
            } @else if (tareaActiva()!.formularioId) {
              <p class="text-red-600 mb-4">No se pudo cargar el formulario asignado.</p>
            } @else {
              <p class="text-amber-600 mb-4">Esta actividad no tiene formulario asignado.</p>
              <textarea [(ngModel)]="observaciones" rows="4" placeholder="Observaciones / resultado"
                class="w-full border rounded-lg p-2 mb-4 dark:bg-gray-700 dark:border-gray-600"></textarea>
            }

            @if (submitError()) {
              <p class="text-red-600 text-sm mb-3">{{ submitError() }}</p>
            }

            <div class="flex justify-end gap-3">
              <button (click)="cerrarModal()" class="px-4 py-2 border rounded-lg dark:border-gray-600 dark:text-gray-200">Cancelar</button>
              <button (click)="guardar()" [disabled]="submitting()"
                class="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50">
                {{ submitting() ? 'Guardando...' : 'Guardar y completar' }}
              </button>
            </div>
          </div>
        </div>
      }
    </div>
  `
})
export class TareaListComponent implements OnInit, OnDestroy {
  private auth = inject(AuthService);
  private tareaService = inject(TareaService);
  private formularioService = inject(FormularioService);
  private portafolioSocket = inject(PortafolioSocketService);
  documentoService = inject(DocumentoService);
  private vozService = inject(VozService);
  private socketSub?: Subscription;

  tareas = signal<TareaFuncionario[]>([]);
  loading = signal(true);
  error = signal('');
  tareaActiva = signal<TareaFuncionario | null>(null);
  formulario = signal<Formulario | null>(null);
  cargandoFormulario = signal(false);
  submitting = signal(false);
  submitError = signal('');
  grabando = signal(false);
  procesandoVoz = signal(false);
  segundosGrabacion = signal(0);
  vozRazon = signal('');

  valores: Record<string, unknown> = {};
  observaciones = '';
  archivoEstado: Record<string, ArchivoEstado | undefined> = {};

  private mediaRecorder?: MediaRecorder;
  private audioChunks: Blob[] = [];
  private grabacionTimer?: ReturnType<typeof setInterval>;

  ngOnInit() {
    this.portafolioSocket.connect();
    this.socketSub = this.portafolioSocket.getUpdates().subscribe(() => this.cargarTareas(false));
    this.cargarTareas();
  }

  ngOnDestroy() {
    this.socketSub?.unsubscribe();
    this.detenerGrabacion();
  }

  cargarTareas(showLoading = true) {
    const userId = this.auth.currentUser()?.id;
    if (!userId) {
      this.error.set('Usuario no identificado');
      this.loading.set(false);
      return;
    }
    if (showLoading) this.loading.set(true);
    this.tareaService.getTareas(userId).subscribe({
      next: (data) => {
        this.tareas.set(data);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('No se pudieron cargar las tareas');
        this.loading.set(false);
      }
    });
  }

  abrirTarea(t: TareaFuncionario) {
    this.tareaActiva.set(t);
    this.valores = {};
    this.observaciones = '';
    this.archivoEstado = {};
    this.submitError.set('');
    this.vozRazon.set('');
    this.formulario.set(null);
    this.cargandoFormulario.set(!!t.formularioId);

    if (t.formularioId) {
      this.formularioService.getById(t.formularioId).subscribe({
        next: (f) => {
          const normalizado = this.normalizarFormulario(f);
          this.formulario.set(normalizado);
          this.inicializarValoresFormulario(normalizado);
          this.cargandoFormulario.set(false);
        },
        error: () => {
          this.cargandoFormulario.set(false);
          this.submitError.set('No se pudo cargar el formulario');
        }
      });
    }
  }

  camposVisibles() {
    const campos = this.formulario()?.campos ?? [];
    return campos.filter(c => c.tipo !== 'boton');
  }

  private normalizarFormulario(form: Formulario): Formulario {
    const campos = (form.campos ?? []).map((campo, index) => ({
      ...campo,
      id: campo.id || `campo-${index}`,
      opciones: Array.isArray(campo.opciones) ? campo.opciones : undefined,
    }));
    return { ...form, campos };
  }

  private inicializarValoresFormulario(form: Formulario): void {
    for (const campo of form.campos ?? []) {
      if (campo.tipo === 'checkbox' && campo.opciones?.length) {
        const actual = this.valores[campo.id];
        if (actual && typeof actual === 'object' && !Array.isArray(actual)) {
          continue;
        }
        const grupo: Record<string, boolean> = {};
        for (const op of campo.opciones) {
          grupo[op] = false;
        }
        this.valores[campo.id] = grupo;
      }
      if (campo.tipo === 'tabla') {
        const actual = this.valores[campo.id];
        if (Array.isArray(actual)) {
          continue;
        }
        const filaInicial: Record<string, string> = {};
        for (const col of campo.opciones || []) {
          filaInicial[col] = '';
        }
        this.valores[campo.id] = [filaInicial];
      }
    }
  }

  isCheckboxOptionChecked(campoId: string, opcion: string): boolean {
    const val = this.valores[campoId];
    if (val && typeof val === 'object' && !Array.isArray(val)) {
      return !!(val as Record<string, boolean>)[opcion];
    }
    return false;
  }

  toggleCheckboxOption(campoId: string, opcion: string, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    const actual = this.valores[campoId];
    const grupo =
      actual && typeof actual === 'object' && !Array.isArray(actual)
        ? { ...(actual as Record<string, boolean>) }
        : {};
    grupo[opcion] = checked;
    this.valores[campoId] = grupo;
  }

  getTablaFilas(campoId: string): any[] {
    if (!this.valores[campoId] || !Array.isArray(this.valores[campoId])) {
      this.valores[campoId] = [];
    }
    return this.valores[campoId] as any[];
  }

  agregarFilaTabla(campoId: string, columnas: string[] | undefined) {
    const filas = this.getTablaFilas(campoId);
    const nuevaFila: Record<string, string> = {};
    for (const col of columnas || []) {
      nuevaFila[col] = '';
    }
    filas.push(nuevaFila);
  }

  eliminarFilaTabla(campoId: string, index: number) {
    const filas = this.getTablaFilas(campoId);
    filas.splice(index, 1);
  }

  cerrarModal() {
    this.detenerGrabacion();
    this.tareaActiva.set(null);
    this.formulario.set(null);
    this.cargandoFormulario.set(false);
  }

  docUrl(campoId: string): string {
    const id = this.valores[campoId];
    return id ? this.documentoService.getDownloadUrl(String(id)) : '#';
  }

  onArchivoSeleccionado(event: Event, campoId: string) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file || !this.tareaActiva()) return;

    const t = this.tareaActiva()!;
    this.archivoEstado[campoId] = { subiendo: true };
    this.documentoService.upload(file, {
      actividadId: t.actividadId,
      portafolioId: t.portafolioId
    }).subscribe({
      next: (doc) => {
        this.valores[campoId] = doc.id;
        this.archivoEstado[campoId] = { nombre: doc.nombreOriginal };
      },
      error: () => {
        this.archivoEstado[campoId] = { error: 'No se pudo subir el archivo' };
      }
    });
  }

  async iniciarGrabacion() {
    const form = this.formulario();
    if (!form?.id) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.audioChunks = [];
      this.mediaRecorder = new MediaRecorder(stream);
      this.mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) this.audioChunks.push(e.data);
      };
      this.mediaRecorder.onstop = () => this.procesarAudioGrabado(form.id!);
      this.mediaRecorder.start();
      this.grabando.set(true);
      this.segundosGrabacion.set(0);
      this.grabacionTimer = setInterval(() => this.segundosGrabacion.update(s => s + 1), 1000);
    } catch {
      this.submitError.set('No se pudo acceder al micrófono');
    }
  }

  detenerGrabacion() {
    if (this.grabacionTimer) {
      clearInterval(this.grabacionTimer);
      this.grabacionTimer = undefined;
    }
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
      this.mediaRecorder.stream.getTracks().forEach(t => t.stop());
    }
    this.grabando.set(false);
  }

  private procesarAudioGrabado(formularioId: string) {
    if (this.audioChunks.length === 0) {
      console.warn('[Voz] No hay chunks de audio para procesar');
      return;
    }
    const blob = new Blob(this.audioChunks, { type: 'audio/webm' });
    const audioUrl = this.logAudioEnConsola(blob, formularioId);

    this.procesandoVoz.set(true);
    console.log('[Voz] Enviando audio a Spring → FastAPI...', {
      formularioId,
      endpoint: `http://localhost:8081/api/voz/llenar-formulario/${formularioId}`,
    });

    this.vozService.llenarFormulario(formularioId, blob).subscribe({
      next: (res) => {
        console.group('[Voz] Respuesta API (Spring / FastAPI / Gemini)');
        console.log('Texto escuchado (transcripción):', res.transcripcion || '(sin transcripción en respuesta)');
        console.log('Valores extraídos para el formulario:', res.valores);
        console.log('Razón / resumen:', res.razon);
        console.log('Respuesta completa:', res);
        console.groupEnd();

        const vals = res.valores || {};
        for (const [k, v] of Object.entries(vals)) {
          this.valores[k] = v;
        }
        const resumen = res.transcripcion
          ? `Escuché: "${res.transcripcion}"`
          : (res.razon || 'Formulario prellenado desde audio');
        this.vozRazon.set(resumen);
        this.procesandoVoz.set(false);
      },
      error: (err) => {
        console.group('[Voz] Error al procesar audio');
        console.error('Status:', err.status);
        console.error('Mensaje:', err.error?.message || err.message);
        console.error('Cuerpo completo:', err.error);
        console.error('Audio enviado (reproducir):', audioUrl);
        console.groupEnd();
        const msg = err.status === 401
          ? 'Sesión expirada o no autenticado. Vuelve a iniciar sesión.'
          : (err.error?.message || 'No se pudo procesar el audio');
        this.submitError.set(msg);
        this.procesandoVoz.set(false);
      }
    });
  }

  /** Logs de depuración: metadata del blob y URL reproducible en consola. */
  private logAudioEnConsola(blob: Blob, formularioId: string): string {
    const url = URL.createObjectURL(blob);
    const duracionSeg = this.segundosGrabacion();

    console.group('[Voz] Audio grabado');
    console.log('Formulario ID:', formularioId);
    console.log('Tipo MIME:', blob.type);
    console.log('Tamaño:', `${(blob.size / 1024).toFixed(2)} KB (${blob.size} bytes)`);
    console.log('Duración grabación:', `${duracionSeg}s`);
    console.log('Fragmentos (chunks):', this.audioChunks.length);
    console.log('URL para reproducir en consola → new Audio(url).play():', url);
    console.log('Blob:', blob);
    console.groupEnd();

    return url;
  }

  private validarFormulario(): string | null {
    const form = this.formulario();
    if (!form) return null;
    for (const campo of form.campos ?? []) {
      if (!campo.requerido || campo.tipo === 'boton') continue;
      const val = this.valores[campo.id];

      if (campo.tipo === 'checkbox' && campo.opciones?.length) {
        const grupo = val as Record<string, boolean> | undefined;
        const algunaSeleccionada = grupo && Object.values(grupo).some(Boolean);
        if (!algunaSeleccionada) {
          return `El campo "${campo.etiqueta}" es requerido`;
        }
        continue;
      }

      if (campo.tipo === 'checkbox') {
        if (!val) {
          return `El campo "${campo.etiqueta}" es requerido`;
        }
        continue;
      }

      if (campo.tipo === 'tabla') {
        const filas = val as any[] | undefined;
        if (!filas || filas.length === 0) {
          return `El campo "${campo.etiqueta}" requiere al menos una fila`;
        }
        const algunaCeldaLlena = filas.some(fila => 
          Object.values(fila).some(cellVal => cellVal !== undefined && cellVal !== null && String(cellVal).trim() !== '')
        );
        if (!algunaCeldaLlena) {
          return `Debes completar la tabla en "${campo.etiqueta}"`;
        }
        continue;
      }

      if (val === undefined || val === null || val === '') {
        return `El campo "${campo.etiqueta}" es requerido`;
      }
    }
    return null;
  }

  guardar() {
    const t = this.tareaActiva();
    if (!t) return;

    const validationError = this.validarFormulario();
    if (validationError) {
      this.submitError.set(validationError);
      return;
    }

    const payload: CompletarActividadPayload = {
      formularioId: t.formularioId,
      contenidoUpdate: JSON.stringify(this.valores)
    };

    if (!t.formularioId) {
      payload.contenidoUpdate = JSON.stringify({ observaciones: this.observaciones });
    }

    this.submitting.set(true);
    this.submitError.set('');

    this.tareaService.completar(t.portafolioId, t.actividadId, payload).subscribe({
      next: () => {
        this.submitting.set(false);
        this.cerrarModal();
        this.cargarTareas(false);
      },
      error: (err) => {
        this.submitting.set(false);
        this.submitError.set(err.error?.message || 'Error al completar la actividad');
      }
    });
  }
}

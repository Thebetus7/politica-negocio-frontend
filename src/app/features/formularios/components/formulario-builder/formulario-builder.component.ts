import { Component, effect, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  CampoFormulario,
  Formulario,
  FormularioService,
} from '../../../../core/services/formulario.service';

type TipoCampo = CampoFormulario['tipo'];

function generarUUID(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  // Fallback para entornos no seguros (HTTP)
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

@Component({
  selector: 'app-formulario-builder',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './formulario-builder.component.html',
  host: {
    class: 'flex flex-1 flex-col min-h-0 w-full'
  }
})
export class FormularioBuilderComponent {
  private svc = inject(FormularioService);

  /** null = modo crear; con datos = editar */
  formularioInicial = input<Formulario | null>(null);
  /** Texto del botón principal */
  guardarLabel = input('Guardar');

  saved = output<Formulario>();
  cancelled = output<void>();

  guardando = signal(false);
  menuAbierto = signal(false);

  formNombre = '';
  formDescripcion = '';
  camposForm = signal<CampoFormulario[]>([]);
  private editandoId: string | null = null;
  private ultimoInicialRef: Formulario | null | undefined;

  tiposDisponibles = [
    { tipo: 'checkbox' as TipoCampo, label: 'Checklist', icono: '☑️' },
    { tipo: 'lista' as TipoCampo, label: 'Selector', icono: '📋' },
    { tipo: 'tabla' as TipoCampo, label: 'Tabla / Grid', icono: '📊' },
    { tipo: 'texto' as TipoCampo, label: 'Texto Corto', icono: '✏️' },
    { tipo: 'texto_largo' as TipoCampo, label: 'Texto Largo', icono: '📝' },
    { tipo: 'numero' as TipoCampo, label: 'Número', icono: '🔢' },
    { tipo: 'fecha' as TipoCampo, label: 'Fecha', icono: '📅' },
    { tipo: 'boton' as TipoCampo, label: 'Botón', icono: '▶️' },
  ];

  constructor() {
    effect(() => {
      const inicial = this.formularioInicial();
      if (inicial === this.ultimoInicialRef) return;
      this.ultimoInicialRef = inicial;
      this.cargarDesde(inicial);
    }, { allowSignalWrites: true });
  }

  private normalizarCamposEntrada(campos: CampoFormulario[] | undefined | null): CampoFormulario[] {
    if (!Array.isArray(campos)) return [];
    return campos.map((campo, index) => ({
      id: campo.id || generarUUID(),
      tipo: campo.tipo,
      etiqueta: campo.etiqueta || '',
      placeholder: campo.placeholder ?? '',
      requerido: !!campo.requerido,
      opciones: Array.isArray(campo.opciones) ? [...campo.opciones] : undefined,
      orden: campo.orden ?? index,
    }));
  }

  private cargarDesde(f: Formulario | null): void {
    if (f?.id) {
      this.editandoId = f.id;
      this.formNombre = f.nombre;
      this.formDescripcion = f.descripcion || '';
      this.camposForm.set(this.normalizarCamposEntrada(f.campos));
    } else if (f) {
      this.editandoId = null;
      this.formNombre = f.nombre || '';
      this.formDescripcion = f.descripcion || '';
      this.camposForm.set(this.normalizarCamposEntrada(f.campos));
    } else {
      this.editandoId = null;
      this.formNombre = '';
      this.formDescripcion = '';
      this.camposForm.set([]);
    }
    this.menuAbierto.set(false);
  }

  toggleMenu(): void {
    this.menuAbierto.update(v => !v);
  }

  agregarCampo(tipo: TipoCampo): void {
    const defaults: Partial<Record<TipoCampo, Partial<CampoFormulario>>> = {
      texto: { etiqueta: 'Pregunta de texto corto', placeholder: 'Escribe tu respuesta...' },
      texto_largo: { etiqueta: 'Descripción o texto largo', placeholder: 'Escribe una descripción detallada...' },
      numero: { etiqueta: 'Pregunta numérica', placeholder: '0' },
      fecha: { etiqueta: 'Pregunta de fecha', placeholder: '' },
      lista: { etiqueta: 'Pregunta de selección de lista', placeholder: '', opciones: ['Opción 1', 'Opción 2'] },
      checkbox: { etiqueta: 'Pregunta de selección múltiple (Checklist)', placeholder: '', opciones: ['Opción 1', 'Opción 2'] },
      tabla: { etiqueta: 'Tabla de datos', placeholder: '', opciones: ['Columna 1', 'Columna 2'] },
      boton: { etiqueta: 'Enviar', placeholder: 'primario', requerido: false },
    };

    const base = defaults[tipo] ?? { etiqueta: this.getTipoLabel(tipo) };
    const nuevo: CampoFormulario = {
      id: generarUUID(),
      tipo,
      etiqueta: base.etiqueta ?? this.getTipoLabel(tipo),
      placeholder: base.placeholder ?? '',
      requerido: base.requerido ?? false,
      opciones: base.opciones,
      orden: this.camposForm().length,
    };
    this.camposForm.update(c => [...c, nuevo]);
    this.menuAbierto.set(false);
  }

  campoAdmiteRequerido(tipo: TipoCampo): boolean {
    return tipo !== 'boton';
  }

  esBotonPrimario(campo: CampoFormulario): boolean {
    return (campo.placeholder || 'primario').toLowerCase() !== 'secundario';
  }

  eliminarCampo(index: number): void {
    this.camposForm.update(c => c.filter((_, i) => i !== index));
  }

  moverCampo(index: number, dir: number): void {
    const arr = [...this.camposForm()];
    const target = index + dir;
    if (target < 0 || target >= arr.length) return;
    [arr[index], arr[target]] = [arr[target], arr[index]];
    this.camposForm.set(arr);
  }

  getTipoLabel(tipo: TipoCampo): string {
    return this.tiposDisponibles.find(t => t.tipo === tipo)?.label ?? tipo;
  }

  parsearOpciones(campo: CampoFormulario, valor: string): void {
    campo.opciones = valor.split(',').map(o => o.trim()).filter(o => !!o);
    this.camposForm.update(campos => [...campos]);
  }

  placeholderPregunta(tipo: TipoCampo): string {
    if (tipo === 'boton') return 'Texto del botón';
    return 'Escribe la pregunta para el funcionario...';
  }

  campoConOpciones(tipo: TipoCampo): boolean {
    return tipo === 'lista' || tipo === 'checkbox' || tipo === 'tabla';
  }

  cancelar(): void {
    this.cancelled.emit();
  }

  guardar(): void {
    if (!this.formNombre.trim()) return;
    this.guardando.set(true);

    const camposConOrden = this.camposForm().map((c, i) => ({
      id: c.id,
      tipo: c.tipo,
      etiqueta: (c.etiqueta || '').trim(),
      placeholder: c.placeholder ?? '',
      requerido: !!c.requerido,
      opciones: c.opciones?.length ? [...c.opciones] : undefined,
      orden: i,
    }));
    const payload: Formulario = {
      nombre: this.formNombre.trim(),
      descripcion: this.formDescripcion.trim(),
      campos: camposConOrden,
    };

    const op = this.editandoId
      ? this.svc.update(this.editandoId, payload)
      : this.svc.create(payload);

    op.subscribe({
      next: (form) => {
        this.guardando.set(false);
        if (camposConOrden.length > 0 && !form.campos?.length) {
          console.error('El servidor no devolvió los campos guardados', { enviados: camposConOrden, respuesta: form });
          alert('El formulario se guardó sin componentes. Reinicia el backend Spring y vuelve a intentar.');
          return;
        }
        this.saved.emit({
          ...form,
          campos: this.normalizarCamposEntrada(form.campos ?? camposConOrden),
        });
      },
      error: (err) => {
        this.guardando.set(false);
        console.error('Error guardando formulario:', err);
        alert('No se pudo guardar el formulario. Revisa la consola.');
      },
    });
  }
}

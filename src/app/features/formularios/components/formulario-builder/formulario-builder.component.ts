import { Component, effect, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  CampoFormulario,
  Formulario,
  FormularioService,
} from '../../../../core/services/formulario.service';

type TipoCampo = CampoFormulario['tipo'];

@Component({
  selector: 'app-formulario-builder',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './formulario-builder.component.html',
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

  tiposDisponibles = [
    { tipo: 'texto' as TipoCampo, label: 'Texto', icono: '✏️' },
    { tipo: 'texto_largo' as TipoCampo, label: 'Párrafo', icono: '📄' },
    { tipo: 'numero' as TipoCampo, label: 'Número', icono: '🔢' },
    { tipo: 'fecha' as TipoCampo, label: 'Fecha', icono: '📅' },
    { tipo: 'email' as TipoCampo, label: 'Email', icono: '📧' },
    { tipo: 'lista' as TipoCampo, label: 'Lista', icono: '📋' },
    { tipo: 'checkbox' as TipoCampo, label: 'Checkbox', icono: '☑️' },
    { tipo: 'radio' as TipoCampo, label: 'Opciones', icono: '🔘' },
    { tipo: 'boton' as TipoCampo, label: 'Botón', icono: '▶️' },
  ];

  constructor() {
    effect(() => {
      this.cargarDesde(this.formularioInicial());
    });
  }

  private cargarDesde(f: Formulario | null): void {
    if (f?.id) {
      this.editandoId = f.id;
      this.formNombre = f.nombre;
      this.formDescripcion = f.descripcion || '';
      this.camposForm.set(JSON.parse(JSON.stringify(f.campos || [])));
    } else if (f) {
      this.editandoId = null;
      this.formNombre = f.nombre || '';
      this.formDescripcion = f.descripcion || '';
      this.camposForm.set(JSON.parse(JSON.stringify(f.campos || [])));
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
    const defaults: Record<TipoCampo, Partial<CampoFormulario>> = {
      texto: { etiqueta: 'Texto', placeholder: '' },
      texto_largo: { etiqueta: 'Párrafo', placeholder: '' },
      numero: { etiqueta: 'Número', placeholder: '0' },
      fecha: { etiqueta: 'Fecha', placeholder: '' },
      email: { etiqueta: 'Correo electrónico', placeholder: 'correo@ejemplo.com' },
      lista: { etiqueta: 'Lista', placeholder: '', opciones: ['Opción 1', 'Opción 2'] },
      checkbox: { etiqueta: 'Acepto los términos', placeholder: '' },
      radio: { etiqueta: 'Opciones', placeholder: '', opciones: ['Opción 1', 'Opción 2'] },
      boton: { etiqueta: 'Enviar', placeholder: 'primario', requerido: false },
    };

    const base = defaults[tipo] ?? { etiqueta: this.getTipoLabel(tipo) };
    const nuevo: CampoFormulario = {
      id: crypto.randomUUID(),
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
  }

  cancelar(): void {
    this.cancelled.emit();
  }

  guardar(): void {
    if (!this.formNombre.trim()) return;
    this.guardando.set(true);

    const camposConOrden = this.camposForm().map((c, i) => ({ ...c, orden: i }));
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
        this.saved.emit(form);
      },
      error: (err) => {
        this.guardando.set(false);
        console.error('Error guardando formulario:', err);
        alert('No se pudo guardar el formulario. Revisa la consola.');
      },
    });
  }
}

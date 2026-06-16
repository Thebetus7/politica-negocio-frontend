import { Component, inject, signal, OnInit } from '@angular/core';
import { SlicePipe } from '@angular/common';
import { FormularioService, Formulario } from '../../../../core/services/formulario.service';
import { FormularioBuilderComponent } from '../../components/formulario-builder/formulario-builder.component';

@Component({
  selector: 'app-formulario-list',
  standalone: true,
  imports: [SlicePipe, FormularioBuilderComponent],
  templateUrl: './formulario-list.component.html',
})
export class FormularioListComponent implements OnInit {
  svc = inject(FormularioService);

  modalAbierto = signal(false);
  modoEdicion = signal(false);
  builderInicial = signal<Formulario | null>(null);
  cargandoBuilder = signal(false);

  ngOnInit() {
    this.svc.getAll().subscribe();
  }

  abrirCrear() {
    this.modoEdicion.set(false);
    this.cargandoBuilder.set(false);
    this.builderInicial.set(null);
    this.modalAbierto.set(true);
  }

  abrirEditar(f: Formulario) {
    if (!f.id) return;
    this.modoEdicion.set(true);
    this.modalAbierto.set(true);
    this.cargandoBuilder.set(true);
    this.builderInicial.set(null);
    this.svc.getById(f.id).subscribe({
      next: (completo) => {
        this.builderInicial.set({
          ...completo,
          campos: Array.isArray(completo.campos) ? completo.campos : [],
        });
        this.cargandoBuilder.set(false);
      },
      error: () => {
        this.builderInicial.set({
          ...f,
          campos: Array.isArray(f.campos) ? f.campos : [],
        });
        this.cargandoBuilder.set(false);
      },
    });
  }

  cerrarModal() {
    this.modalAbierto.set(false);
    this.builderInicial.set(null);
    this.cargandoBuilder.set(false);
  }

  onBuilderSaved() {
    this.svc.getAll().subscribe();
    this.cerrarModal();
  }

  eliminar(f: Formulario) {
    if (!confirm(`¿Eliminar el formulario "${f.nombre}"?`)) return;
    this.svc.softDelete(f.id!).subscribe();
  }
}

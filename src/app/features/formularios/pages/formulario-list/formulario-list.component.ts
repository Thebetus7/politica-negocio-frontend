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

  ngOnInit() {
    this.svc.getAll().subscribe();
  }

  abrirCrear() {
    this.modoEdicion.set(false);
    this.builderInicial.set(null);
    this.modalAbierto.set(true);
  }

  abrirEditar(f: Formulario) {
    this.modoEdicion.set(true);
    this.builderInicial.set(JSON.parse(JSON.stringify(f)));
    this.modalAbierto.set(true);
  }

  cerrarModal() {
    this.modalAbierto.set(false);
  }

  onBuilderSaved() {
    this.cerrarModal();
  }

  eliminar(f: Formulario) {
    if (!confirm(`¿Eliminar el formulario "${f.nombre}"?`)) return;
    this.svc.softDelete(f.id!).subscribe();
  }
}

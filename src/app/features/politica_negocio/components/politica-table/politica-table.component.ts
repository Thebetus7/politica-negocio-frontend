import { Component, Input, Output, EventEmitter, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

export interface Politica {
  id: number;
  nombre: string;
  descripcion: string;
  estado: string;
  colaboradores: any[];
  updated_at: string;
}

@Component({
  selector: 'app-politica-table',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './politica-table.component.html',
})
export class PoliticaTableComponent {
  @Input() politicas: Politica[] = [];
  @Output() onEliminar = new EventEmitter<Politica>();
  @Output() onGestionarColaboradores = new EventEmitter<Politica>();

  search = signal('');

  politicasFiltradas = computed(() => {
    const term = this.search().toLowerCase().trim();
    if (!term) return this.politicas;
    return this.politicas.filter(p => 
      p.nombre.toLowerCase().includes(term) || 
      (p.descripcion && p.descripcion.toLowerCase().includes(term))
    );
  });

  eliminar(politica: Politica) {
    this.onEliminar.emit(politica);
  }

  gestionarColaboradores(politica: Politica) {
    this.onGestionarColaboradores.emit(politica);
  }
}

import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

export interface Politica {
  id: string;
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
export class PoliticaTableComponent implements OnChanges {
  @Input() politicas: Politica[] = [];
  @Output() onEliminar = new EventEmitter<Politica>();
  @Output() onVer = new EventEmitter<Politica>();

  search = signal('');
  politicasFiltradas = signal<Politica[]>([]);

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['politicas']) {
      this.aplicarFiltro(this.search());
    }
  }

  onSearchChange(value: string): void {
    this.search.set(value);
    this.aplicarFiltro(value);
  }

  private aplicarFiltro(term: string): void {
    const query = term.toLowerCase().trim();
    if (!query) {
      this.politicasFiltradas.set(this.politicas);
      return;
    }
    this.politicasFiltradas.set(
      this.politicas.filter(p =>
        p.nombre.toLowerCase().includes(query) ||
        (p.descripcion && p.descripcion.toLowerCase().includes(query))
      )
    );
  }

  eliminar(politica: Politica) {
    this.onEliminar.emit(politica);
  }

  verPolitica(politica: Politica) {
    this.onVer.emit(politica);
  }
}

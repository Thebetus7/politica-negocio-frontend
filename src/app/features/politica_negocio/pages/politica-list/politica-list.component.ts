import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PoliticaTableComponent, Politica } from '../../components/politica-table/politica-table.component';
import { PoliticaFormComponent } from '../../components/politica-form/politica-form.component';
import { Router } from '@angular/router';

@Component({
  selector: 'app-politica-list',
  standalone: true,
  imports: [CommonModule, PoliticaTableComponent, PoliticaFormComponent],
  templateUrl: './politica-list.component.html',
})
export class PoliticaListComponent implements OnInit {
  politicas = signal<Politica[]>([]);
  showCreateModal = signal(false);

  constructor(private router: Router) {}

  ngOnInit() {
    // Datos de ejemplo basados en el contexto del usuario
    this.politicas.set([
      {
        id: 1,
        nombre: 'Política de Compras Mayoristas',
        descripcion: 'Reglas para el procesamiento de pedidos superiores a 1000 unidades.',
        estado: 'publicado',
        colaboradores: [
          { usuario: { name: 'Edberto Sanchez' } },
          { usuario: { name: 'Juan Perez' } }
        ],
        updated_at: '2026-04-08T12:00:00Z'
      },
      {
        id: 2,
        nombre: 'Validación de Crédito Cliente',
        descripcion: 'Flujo de aprobación para nuevas solicitudes de crédito.',
        estado: 'borrador',
        colaboradores: [
          { usuario: { name: 'Maria Lopez' } }
        ],
        updated_at: '2026-04-08T15:30:00Z'
      }
    ]);
  }

  openCreateModal() {
    this.showCreateModal.set(true);
  }

  handleCreate(formData: any) {
    console.log('Creando política:', formData);
    this.showCreateModal.set(false);
    // Simular que después de crear se va al editor del diagrama
    this.router.navigate(['/politicas/diagrama', 99]); 
  }

  handleEliminar(politica: Politica) {
    if (confirm(`¿Estás seguro de eliminar la política "${politica.nombre}"?`)) {
      this.politicas.update(list => list.filter(p => p.id !== politica.id));
    }
  }

  handleGestionarColaboradores(politica: Politica) {
    console.log('Gestionando colaboradores para:', politica.nombre);
    // Aquí se abriría otro modal similar al de Vue
  }
}

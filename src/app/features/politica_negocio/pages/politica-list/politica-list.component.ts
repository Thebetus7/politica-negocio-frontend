import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PoliticaTableComponent, Politica } from '../../components/politica-table/politica-table.component';
import { PoliticaFormComponent } from '../../components/politica-form/politica-form.component';
import { Router } from '@angular/router';
import { PoliticaService, PoliticaNegocio } from '../../../../core/services/politica.service';

@Component({
  selector: 'app-politica-list',
  standalone: true,
  imports: [CommonModule, PoliticaTableComponent, PoliticaFormComponent],
  templateUrl: './politica-list.component.html',
})
export class PoliticaListComponent implements OnInit, OnDestroy {
  politicas = signal<Politica[]>([]);
  showCreateModal = signal(false);

  private router = inject(Router);
  private politicaService = inject(PoliticaService);
  private refreshTimer?: ReturnType<typeof setInterval>;

  ngOnInit() {
    this.loadPoliticas();
    // Refresca para reflejar políticas nuevas creadas en el editor/workflow.
    this.refreshTimer = setInterval(() => this.loadPoliticas(), 5000);
  }

  ngOnDestroy() {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
    }
  }

  private loadPoliticas(): void {
    this.politicaService.getAll().subscribe({
      next: (data: PoliticaNegocio[]) => {
        const mapped: Politica[] = data.map(p => ({
          id: (p as any).id ?? (p as any)._id ?? '',
          nombre: p.nombre,
          descripcion: p.descripcion || '',
          estado: 'activo',
          colaboradores: [],
          updated_at: p.updatedAt || p.createdAt || ''
        }));
        this.politicas.set(mapped);
      },
      error: (err) => console.error('Error cargando políticas:', err)
    });
  }

  openCreateModal() {
    this.showCreateModal.set(true);
  }

  handleCreate(formData: any) {
    const politica: PoliticaNegocio = {
      nombre: formData.nombre,
      descripcion: formData.descripcion || '',
    };
    this.politicaService.create(politica).subscribe({
      next: (created) => {
        this.showCreateModal.set(false);
        this.router.navigate(['/politicas/diagrama', created.id]);
      },
      error: (err) => console.error('Error creando política:', err)
    });
  }

  handleEliminar(politica: Politica) {
    if (confirm(`¿Estás seguro de eliminar la política "${politica.nombre}"?`)) {
      this.politicaService.softDelete(politica.id).subscribe({
        next: () => this.politicas.update(list => list.filter(p => p.id !== politica.id)),
        error: (err) => console.error('Error eliminando:', err)
      });
    }
  }

  handleVer(politica: Politica) {
    this.router.navigate(['/politicas/diagrama', politica.id]);
  }
}

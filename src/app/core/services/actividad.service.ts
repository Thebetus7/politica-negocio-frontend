import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';

export interface Actividad {
  id?: string;
  politicaId: string;
  departamentoId: string;
  actividadRefId?: string;
  formUpdateId?: string;
  nombre: string;
  estado?: string;
  ejeX: string;
  ejeY: string;
  tipoNodo: string;
  createdAt?: string;
}

@Injectable({ providedIn: 'root' })
export class ActividadService {
  private http = inject(HttpClient);
  private baseUrl = 'http://localhost:8081/api/politicas';

  getByPolitica(politicaId: string) {
    return this.http.get<Actividad[]>(`${this.baseUrl}/${politicaId}/actividades`);
  }

  create(politicaId: string, actividad: Actividad) {
    return this.http.post<Actividad>(`${this.baseUrl}/${politicaId}/actividades`, actividad);
  }

  update(politicaId: string, id: string, actividad: Actividad) {
    return this.http.put<Actividad>(`${this.baseUrl}/${politicaId}/actividades/${id}`, actividad);
  }

  softDelete(politicaId: string, id: string) {
    return this.http.delete(`${this.baseUrl}/${politicaId}/actividades/${id}`);
  }
}

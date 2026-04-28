import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';

export interface Flujo {
  id?: string;
  politicaId: string;
  actividadId: string;
  proceso: any;
  createdAt?: string;
}

@Injectable({ providedIn: 'root' })
export class FlujoService {
  private http = inject(HttpClient);
  private baseUrl = 'http://localhost:8081/api/politicas';

  getByPolitica(politicaId: string) {
    return this.http.get<Flujo[]>(`${this.baseUrl}/${politicaId}/flujos`);
  }

  create(politicaId: string, flujo: Flujo) {
    return this.http.post<Flujo>(`${this.baseUrl}/${politicaId}/flujos`, flujo);
  }

  update(politicaId: string, id: string, flujo: Flujo) {
    return this.http.put<Flujo>(`${this.baseUrl}/${politicaId}/flujos/${id}`, flujo);
  }

  softDelete(politicaId: string, id: string) {
    return this.http.delete(`${this.baseUrl}/${politicaId}/flujos/${id}`);
  }
}

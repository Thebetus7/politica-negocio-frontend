import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';

export interface FormUpdate {
  id?: string;
  contenidoUpdate?: string;
  formularioId: string;
  actividadId: string;
}

@Injectable({ providedIn: 'root' })
export class FormUpdateService {
  private http = inject(HttpClient);
  private apiUrl = 'http://localhost:8081/api/form-updates';

  getByActividad(actividadId: string) {
    return this.http.get<FormUpdate[]>(`${this.apiUrl}?actividadId=${actividadId}`);
  }

  create(payload: FormUpdate) {
    return this.http.post<FormUpdate>(this.apiUrl, payload);
  }

  update(id: string, payload: FormUpdate) {
    return this.http.put<FormUpdate>(`${this.apiUrl}/${id}`, payload);
  }
}

import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';

export interface FuncionarioDepa {
  id?: string;
  userId: string;
  departamentoId: string;
}

@Injectable({ providedIn: 'root' })
export class FuncionarioDepaService {
  private http = inject(HttpClient);
  private apiUrl = 'http://localhost:8081/api/funcionarios-depa';

  getByDepartamento(departamentoId: string) {
    return this.http.get<FuncionarioDepa[]>(`${this.apiUrl}?departamentoId=${departamentoId}`);
  }

  getByUsuario(userId: string) {
    return this.http.get<FuncionarioDepa[]>(`${this.apiUrl}/usuario/${userId}`);
  }

  create(asignacion: FuncionarioDepa) {
    return this.http.post<FuncionarioDepa>(this.apiUrl, asignacion);
  }

  softDelete(id: string) {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }
}

import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { tap } from 'rxjs';
import { catchError, throwError } from 'rxjs';

export interface PoliticaNegocio {
  id?: string;
  nombre: string;
  descripcion?: string;
  createdAt?: string;
  updatedAt?: string;
}

@Injectable({ providedIn: 'root' })
export class PoliticaService {
  private http = inject(HttpClient);
  private apiUrl = 'http://localhost:8081/api/politicas';

  politicas = signal<PoliticaNegocio[]>([]);
  loading = signal(false);

  getAll() {
    this.loading.set(true);
    return this.http.get<PoliticaNegocio[]>(`${this.apiUrl}/public`).pipe(
      tap(data => {
        this.politicas.set(data);
        this.loading.set(false);
      }),
      catchError((err) => {
        this.loading.set(false);
        return throwError(() => err);
      })
    );
  }

  getById(id: string) {
    return this.http.get<PoliticaNegocio>(`${this.apiUrl}/${id}`);
  }

  create(politica: PoliticaNegocio) {
    return this.http.post<PoliticaNegocio>(this.apiUrl, politica).pipe(
      tap(nueva => this.politicas.update(list => [...list, nueva]))
    );
  }

  update(id: string, politica: PoliticaNegocio) {
    return this.http.put<PoliticaNegocio>(`${this.apiUrl}/${id}`, politica).pipe(
      tap(updated => this.politicas.update(list => list.map(p => p.id === id ? updated : p)))
    );
  }

  softDelete(id: string) {
    return this.http.delete(`${this.apiUrl}/${id}`).pipe(
      tap(() => this.politicas.update(list => list.filter(p => p.id !== id)))
    );
  }
}

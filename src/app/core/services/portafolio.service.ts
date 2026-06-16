import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { tap } from 'rxjs';
import { API_URL } from './api-config';

export interface Portafolio {
  id?: string;
  nombre: string;
  identificadorUnico: string;
  politicaNegocioId?: string;
  createdAt?: string;
}

@Injectable({
  providedIn: 'root'
})
export class PortafolioService {
  private http = inject(HttpClient);
  private apiUrl = `${API_URL}/portafolios`;

  portafolios = signal<Portafolio[]>([]);

  getAll() {
    return this.http.get<Portafolio[]>(this.apiUrl).pipe(
      tap(data => this.portafolios.set(data))
    );
  }

  create(portafolio: Partial<Portafolio>) {
    return this.http.post<Portafolio>(this.apiUrl, portafolio).pipe(
      tap(newPort => {
        this.portafolios.update(ports => [...ports, newPort]);
      })
    );
  }

  delete(id: string) {
    return this.http.delete(`${this.apiUrl}/${id}`).pipe(
      tap(() => {
        this.portafolios.update(ports => ports.filter(p => p.id !== id));
      })
    );
  }
}

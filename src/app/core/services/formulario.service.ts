import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { tap } from 'rxjs';
export interface CampoFormulario {
  id: string;            // UUID generado en frontend para trackear
  tipo: 'texto' | 'texto_largo' | 'numero' | 'fecha' | 'lista' | 'checkbox' | 'radio';
  etiqueta: string;
  placeholder?: string;
  requerido: boolean;
  opciones?: string[];   // para lista, radio
  orden: number;
}

export interface Formulario {
  id?: string;
  nombre: string;
  descripcion?: string;
  campos: CampoFormulario[];
  createdAt?: string;
  updatedAt?: string;
}

@Injectable({ providedIn: 'root' })
export class FormularioService {
  private http = inject(HttpClient);
  private apiUrl = 'http://localhost:8081/api/formularios';

  formularios = signal<Formulario[]>([]);
  loading = signal(false);

  getAll() {
    this.loading.set(true);
    return this.http.get<Formulario[]>(this.apiUrl).pipe(
      tap(data => {
        this.formularios.set(data);
        this.loading.set(false);
      })
    );
  }

  create(formulario: Formulario) {
    return this.http.post<Formulario>(this.apiUrl, formulario).pipe(
      tap(nuevo => {
        this.formularios.update(list => [...list, nuevo]);
      })
    );
  }

  update(id: string, formulario: Formulario) {
    return this.http.put<Formulario>(`${this.apiUrl}/${id}`, formulario).pipe(
      tap(updated => {
        this.formularios.update(list =>
          list.map(f => f.id === id ? updated : f)
        );
      })
    );
  }

  softDelete(id: string) {
    return this.http.delete(`${this.apiUrl}/${id}`).pipe(
      tap(() => {
        this.formularios.update(list => list.filter(f => f.id !== id));
      })
    );
  }
}

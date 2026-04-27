import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { tap } from 'rxjs';

export interface CampoFormulario {
  id: string;
  tipo: 'texto' | 'texto_largo' | 'numero' | 'email' | 'telefono' | 'fecha' | 'lista' | 'checkbox' | 'radio' | 'archivo' | 'url';
  etiqueta: string;
  placeholder?: string;
  requerido: boolean;
  opciones?: string[]; // para lista y radio
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

@Injectable({
  providedIn: 'root'
})
export class FormularioService {
  private http = inject(HttpClient);
  private apiUrl = 'http://localhost:8081/api/formularios';

  formularios = signal<Formulario[]>([]);

  getAll() {
    return this.http.get<Formulario[]>(this.apiUrl).pipe(
      tap(data => this.formularios.set(data))
    );
  }

  getById(id: string) {
    return this.http.get<Formulario>(`${this.apiUrl}/${id}`);
  }

  create(formulario: Omit<Formulario, 'id'>) {
    return this.http.post<Formulario>(this.apiUrl, formulario).pipe(
      tap(nuevo => {
        this.formularios.update(lista => [...lista, nuevo]);
      })
    );
  }

  update(id: string, formulario: Partial<Formulario>) {
    return this.http.put<Formulario>(`${this.apiUrl}/${id}`, formulario).pipe(
      tap(actualizado => {
        this.formularios.update(lista =>
          lista.map(f => f.id === id ? actualizado : f)
        );
      })
    );
  }

  delete(id: string) {
    return this.http.delete(`${this.apiUrl}/${id}`).pipe(
      tap(() => {
        this.formularios.update(lista => lista.filter(f => f.id !== id));
      })
    );
  }
}

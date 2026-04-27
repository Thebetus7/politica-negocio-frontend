import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { tap } from 'rxjs';

export interface Departamento {
  id?: string;
  nombre: string;
  descripcion?: string;
  createdAt?: string;
}

@Injectable({
  providedIn: 'root'
})
export class DepartamentoService {
  private http = inject(HttpClient);
  private apiUrl = 'http://localhost:8081/api/departamentos';

  departamentos = signal<Departamento[]>([]);

  getAll() {
    return this.http.get<Departamento[]>(this.apiUrl).pipe(
      tap(data => this.departamentos.set(data))
    );
  }

  create(departamento: Partial<Departamento>) {
    return this.http.post<Departamento>(this.apiUrl, departamento).pipe(
      tap(newDep => {
        this.departamentos.update(deps => [...deps, newDep]);
      })
    );
  }

  update(id: string, departamento: Partial<Departamento>) {
    return this.http.put<Departamento>(`${this.apiUrl}/${id}`, departamento).pipe(
      tap(updatedDep => {
        this.departamentos.update(deps => 
          deps.map(d => d.id === id ? updatedDep : d)
        );
      })
    );
  }

  delete(id: string) {
    return this.http.delete(`${this.apiUrl}/${id}`).pipe(
      tap(() => {
        this.departamentos.update(deps => deps.filter(d => d.id !== id));
      })
    );
  }
}

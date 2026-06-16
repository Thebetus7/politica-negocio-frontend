import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { tap } from 'rxjs';
import { User } from './auth.service';

import { API_URL } from './api-config';

@Injectable({
  providedIn: 'root'
})
export class UsuarioService {
  private http = inject(HttpClient);
  private apiUrl = `${API_URL}/usuarios`;

  usuarios = signal<User[]>([]);

  getAll() {
    return this.http.get<User[]>(this.apiUrl).pipe(
      tap(data => this.usuarios.set(data))
    );
  }

  create(usuario: Partial<User> & { password?: string }) {
    return this.http.post<User>(this.apiUrl, usuario).pipe(
      tap(newUsr => {
        this.usuarios.update(usrs => [...usrs, newUsr]);
      })
    );
  }

  delete(id: string) {
    return this.http.delete(`${this.apiUrl}/${id}`).pipe(
      tap(() => {
        this.usuarios.update(usrs => usrs.filter(u => u.id !== id));
      })
    );
  }
}

import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';

export interface LogPoliticaCompileResult {
  valido: boolean;
  version?: number;
  mensaje?: string;
  flujoJson?: Record<string, unknown>;
}

export interface LogPolitica {
  id?: string;
  politicaId: string;
  version: number;
  tiempo?: string;
  valido: boolean;
  funcional: boolean;
  flujoJson?: Record<string, unknown>;
  mensajeValidacion?: string;
  createdAt?: string;
}

import { API_URL } from './api-config';

@Injectable({ providedIn: 'root' })
export class LogPoliticaService {
  private http = inject(HttpClient);
  private baseUrl = `${API_URL}/politicas`;

  compile(politicaId: string) {
    return this.http.post<LogPoliticaCompileResult>(
      `${this.baseUrl}/${politicaId}/log-politica/compile`,
      {}
    );
  }

  getUltimo(politicaId: string) {
    return this.http.get<LogPolitica>(`${this.baseUrl}/${politicaId}/log-politica`);
  }

  getHistorial(politicaId: string) {
    return this.http.get<LogPolitica[]>(`${this.baseUrl}/${politicaId}/log-politica/historial`);
  }
}

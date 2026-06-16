import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';

export interface TareaFuncionario {
  portafolioId: string;
  politicaId: string;
  actividadId: string;
  actividadNombre: string;
  tipoNodo: string;
  departamentoId: string;
  formularioId?: string;
  flujoInstanciaId: string;
  portafolioJson?: string;
}

export interface CompletarActividadPayload {
  formularioId?: string;
  contenidoUpdate: string;
  decisionLabel?: string;
  continuarIteracion?: boolean;
}

import { API_URL } from './api-config';

@Injectable({ providedIn: 'root' })
export class TareaService {
  private http = inject(HttpClient);
  private baseUrl = API_URL;

  getTareas(userId: string) {
    return this.http.get<TareaFuncionario[]>(`${this.baseUrl}/funcionarios/${userId}/tareas`);
  }

  completar(portafolioId: string, actividadId: string, payload: CompletarActividadPayload) {
    return this.http.post(`${this.baseUrl}/portafolios/${portafolioId}/actividades/${actividadId}/completar`, payload);
  }
}

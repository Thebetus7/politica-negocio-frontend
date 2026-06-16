import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface VozFillResponse {
  transcripcion?: string;
  valores: Record<string, unknown>;
  razon?: string;
}

import { API_URL } from './api-config';

@Injectable({ providedIn: 'root' })
export class VozService {
  private http = inject(HttpClient);
  private apiUrl = `${API_URL}/voz`;

  llenarFormulario(formularioId: string, audioBlob: Blob, filename = 'audio.webm'): Observable<VozFillResponse> {
    const formData = new FormData();
    formData.append('audio', audioBlob, filename);
    return this.http.post<VozFillResponse>(`${this.apiUrl}/llenar-formulario/${formularioId}`, formData);
  }
}

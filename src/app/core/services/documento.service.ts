import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface DocumentoUploadResponse {
  id: string;
  nombreOriginal: string;
  mimeType: string;
  size: number;
  downloadUrl: string;
}

import { API_URL } from './api-config';

@Injectable({ providedIn: 'root' })
export class DocumentoService {
  private http = inject(HttpClient);
  private apiUrl = `${API_URL}/documentos`;

  upload(
    file: File,
    meta?: { actividadId?: string; portafolioId?: string }
  ): Observable<DocumentoUploadResponse> {
    const formData = new FormData();
    formData.append('file', file);
    if (meta?.actividadId) formData.append('actividadId', meta.actividadId);
    if (meta?.portafolioId) formData.append('portafolioId', meta.portafolioId);
    return this.http.post<DocumentoUploadResponse>(this.apiUrl, formData);
  }

  getDownloadUrl(id: string): string {
    return `${this.apiUrl}/${id}/download`;
  }
}

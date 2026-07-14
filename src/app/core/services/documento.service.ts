import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface DocumentoUploadResponse {
  id: string;
  nombreOriginal: string;
  mimeType: string;
  size: number;
  downloadUrl: string;
  estado?: string;
  versionActual?: number;
  contenidoTexto?: string;
  politicaId?: string;
  actividadId?: string;
  portafolioId?: string;
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

  listar(busqueda?: string, estado?: string, ordenFechaDesc = true): Observable<DocumentoUploadResponse[]> {
    let params: any = { ordenFechaDesc: String(ordenFechaDesc) };
    if (busqueda) params.busqueda = busqueda;
    if (estado) params.estado = estado;
    return this.http.get<DocumentoUploadResponse[]>(this.apiUrl, { params });
  }

  listarPorPolitica(politicaId: string): Observable<DocumentoUploadResponse[]> {
    return this.http.get<DocumentoUploadResponse[]>(`${this.apiUrl}/politica/${politicaId}`);
  }

  getById(id: string): Observable<DocumentoUploadResponse> {
    return this.http.get<DocumentoUploadResponse>(`${this.apiUrl}/${id}`);
  }

  cambiarEstado(id: string, estado: string): Observable<DocumentoUploadResponse> {
    return this.http.put<DocumentoUploadResponse>(`${this.apiUrl}/${id}/estado`, { estado });
  }

  actualizarContenido(id: string, contenido: string): Observable<DocumentoUploadResponse> {
    return this.http.put<DocumentoUploadResponse>(`${this.apiUrl}/${id}/contenido`, { contenido });
  }

  obtenerVersiones(id: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/${id}/versiones`);
  }

  crearVersion(id: string, comentario: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/${id}/versiones`, { comentario });
  }

  revertirVersion(id: string, versionId: string): Observable<DocumentoUploadResponse> {
    return this.http.post<DocumentoUploadResponse>(`${this.apiUrl}/${id}/revertir/${versionId}`, {});
  }

  eliminar(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}

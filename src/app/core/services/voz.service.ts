import { Injectable } from '@angular/core';
import { Observable, throwError } from 'rxjs';

export interface VozFillResponse {
  transcripcion?: string;
  valores: Record<string, unknown>;
  razon?: string;
}

/**
 * @deprecated Este servicio ha sido reemplazado por WhisperService y VoiceFormMapperService
 * para realizar la transcripción y el mapeo de voz 100% de forma local en el navegador.
 */
@Injectable({ providedIn: 'root' })
export class VozService {
  constructor() {}

  llenarFormulario(formularioId: string, audioBlob: Blob, filename = 'audio.webm'): Observable<VozFillResponse> {
    console.warn('[VozService] Este método está obsoleto. Utilice WhisperService local en su lugar.');
    return throwError(() => new Error('Este servicio está obsoleto. Use WhisperService local.'));
  }
}

import { Injectable, NgZone, inject } from '@angular/core';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { Observable, Subject } from 'rxjs';
import { BASE_URL } from '../../../core/services/api-config';

@Injectable({
  providedIn: 'root'
})
export class DiagramService {
  private ngZone = inject(NgZone);
  private stompClient!: Client;
  private diagramUpdates = new Subject<any>();
  private cursorUpdates = new Subject<any>();
  private currentPoliticaId: string | null = null;

  getDiagramUpdates(): Observable<any> {
    return this.diagramUpdates.asObservable();
  }

  getCursorUpdates(): Observable<any> {
    return this.cursorUpdates.asObservable();
  }

  /**
   * Conectar al WebSocket de un diagrama específico por politicaId.
   */
  connectToDiagram(politicaId: string): void {
    // Si ya estamos conectados al mismo, no reconectar
    if (this.currentPoliticaId === politicaId && this.stompClient?.connected) {
      return;
    }

    // Desconectar si había conexión previa
    this.disconnect();

    this.currentPoliticaId = politicaId;

    this.stompClient = new Client({
      webSocketFactory: () => new SockJS(`${BASE_URL}/ws-diagram`),
      debug: (str) => console.log('STOMP: ', str),
      reconnectDelay: 5000,
    });

    this.stompClient.onConnect = () => {
      console.log(`Conectado a WebSocket para política: ${politicaId}`);

      // Suscripción a actualizaciones del diagrama
      this.stompClient.subscribe(`/topic/diagram/${politicaId}`, (message) => {
        if (message.body) {
          try {
            const parsed = JSON.parse(message.body);
            // Emitir DENTRO de NgZone para que Angular detecte los cambios
            this.ngZone.run(() => this.diagramUpdates.next(parsed));
          } catch {
            this.ngZone.run(() => this.diagramUpdates.next(message.body));
          }
        }
      });

      // Suscripción a posiciones de cursores de otros usuarios
      this.stompClient.subscribe(`/topic/diagram/cursors/${politicaId}`, (message) => {
        if (message.body) {
          try {
            const parsed = JSON.parse(message.body);
            this.ngZone.run(() => this.cursorUpdates.next(parsed));
          } catch {
            this.ngZone.run(() => this.cursorUpdates.next(message.body));
          }
        }
      });
    };

    this.stompClient.activate();
  }

  /**
   * Enviar actualización del diagrama.
   */
  sendDiagramUpdate(data: any): void {
    if (this.stompClient?.connected && this.currentPoliticaId) {
      this.stompClient.publish({
        destination: `/app/diagram/update/${this.currentPoliticaId}`,
        body: JSON.stringify(data)
      });
    }
  }

  /**
   * Enviar posición del cursor del usuario actual.
   * Payload: { userId, nombre, x, y, color }
   */
  sendCursorPosition(cursorData: { userId: string; nombre: string; x: number; y: number; color: string }): void {
    if (this.stompClient?.connected && this.currentPoliticaId) {
      this.stompClient.publish({
        destination: `/app/diagram/cursor/${this.currentPoliticaId}`,
        body: JSON.stringify(cursorData)
      });
    }
  }

  /**
   * Desconectar WebSocket.
   */
  disconnect(): void {
    if (this.stompClient?.connected) {
      this.stompClient.deactivate();
    }
    this.currentPoliticaId = null;
  }
}

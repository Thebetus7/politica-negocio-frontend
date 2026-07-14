import { Injectable } from '@angular/core';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { Observable, Subject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class DocumentoSocketService {
  private stompClient!: Client;
  private documentUpdates = new Subject<any>();
  private cursorUpdates = new Subject<any>();
  private currentDocumentoId: string | null = null;

  getDocumentUpdates(): Observable<any> {
    return this.documentUpdates.asObservable();
  }

  getCursorUpdates(): Observable<any> {
    return this.cursorUpdates.asObservable();
  }

  /**
   * Conecta al WebSocket de colaboración para un documento específico.
   */
  connectToDocument(documentoId: string): void {
    if (this.currentDocumentoId === documentoId && this.stompClient?.connected) {
      return;
    }

    this.disconnect();
    this.currentDocumentoId = documentoId;

    this.stompClient = new Client({
      webSocketFactory: () => new SockJS('http://localhost:8081/ws-diagram'),
      debug: (str) => console.log('STOMP DOCS: ', str),
      reconnectDelay: 5000,
    });

    this.stompClient.onConnect = () => {
      console.log(`Conectado a WebSocket para documento: ${documentoId}`);

      // Suscripción a cambios de texto
      this.stompClient.subscribe(`/topic/documento/${documentoId}`, (message) => {
        if (message.body) {
          try {
            this.documentUpdates.next(JSON.parse(message.body));
          } catch {
            this.documentUpdates.next(message.body);
          }
        }
      });

      // Suscripción a cursores
      this.stompClient.subscribe(`/topic/documento/cursors/${documentoId}`, (message) => {
        if (message.body) {
          try {
            this.cursorUpdates.next(JSON.parse(message.body));
          } catch {
            this.cursorUpdates.next(message.body);
          }
        }
      });
    };

    this.stompClient.activate();
  }

  /**
   * Envía la actualización del contenido del documento.
   */
  sendDocumentUpdate(data: any): void {
    if (this.stompClient?.connected && this.currentDocumentoId) {
      this.stompClient.publish({
        destination: `/app/documento/update/${this.currentDocumentoId}`,
        body: JSON.stringify(data)
      });
    }
  }

  /**
   * Envía la posición del cursor de un usuario.
   */
  sendCursorPosition(cursorData: { userId: string; nombre: string; position: number; color: string }): void {
    if (this.stompClient?.connected && this.currentDocumentoId) {
      this.stompClient.publish({
        destination: `/app/documento/cursor/${this.currentDocumentoId}`,
        body: JSON.stringify(cursorData)
      });
    }
  }

  /**
   * Desconecta del WebSocket.
   */
  disconnect(): void {
    if (this.stompClient?.connected) {
      this.stompClient.deactivate();
    }
    this.currentDocumentoId = null;
  }
}

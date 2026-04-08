import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { Observable, Subject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class DiagramService {
  private stompClient: Client;
  private diagramUpdates = new Subject<any>();

  constructor(private http: HttpClient) {
    this.stompClient = new Client({
      // Usamos SockJS como fallback y factory para Stomp
      webSocketFactory: () => new SockJS('http://localhost:8080/ws-diagram'),
      debug: (str) => console.log('STOMP: ', str),
      reconnectDelay: 5000,
    });
    
    this.stompClient.onConnect = (frame) => {
      console.log('Connectado a WebSocket');
      // Suscripción al tópico general o específico del diagrama. ID=1 por conveniencia de prueba
      this.stompClient.subscribe('/topic/diagram/1', (message) => {
        if (message.body) {
          this.diagramUpdates.next(message.body);
        }
      });
    };
    
    this.stompClient.activate();
  }

  getBaseDiagram(nombre: string): Observable<any> {
    return this.http.get(`http://localhost:8080/api/diagrams/base/${nombre}`);
  }

  getDiagramUpdates(): Observable<any> {
    return this.diagramUpdates.asObservable();
  }

  sendDiagramUpdate(id: string, jsonContent: string) {
    if (this.stompClient.connected) {
      this.stompClient.publish({
        destination: `/app/diagram/update/${id}`,
        body: jsonContent
      });
    }
  }
}

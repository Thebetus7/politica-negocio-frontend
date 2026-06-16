import { Injectable, OnDestroy } from '@angular/core';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { Observable, Subject } from 'rxjs';

export interface PortafolioUpdateEvent {
  type: string;
  portafolioId: string;
  progreso?: number;
  estado?: string;
}

import { BASE_URL } from './api-config';

@Injectable({
  providedIn: 'root'
})
export class PortafolioSocketService implements OnDestroy {
  private stompClient?: Client;
  private updates = new Subject<PortafolioUpdateEvent>();
  private connected = false;

  getUpdates(): Observable<PortafolioUpdateEvent> {
    return this.updates.asObservable();
  }

  connect(): void {
    if (this.connected && this.stompClient?.connected) {
      return;
    }

    this.stompClient = new Client({
      webSocketFactory: () => new SockJS(`${BASE_URL}/ws-diagram`),
      debug: () => {},
      reconnectDelay: 5000,
    });

    this.stompClient.onConnect = () => {
      this.connected = true;
      this.stompClient?.subscribe('/topic/portafolios', (message) => {
        if (!message.body) return;
        try {
          this.updates.next(JSON.parse(message.body) as PortafolioUpdateEvent);
        } catch {
          // ignore malformed payloads
        }
      });
    };

    this.stompClient.activate();
  }

  disconnect(): void {
    this.connected = false;
    this.stompClient?.deactivate();
  }

  ngOnDestroy(): void {
    this.disconnect();
  }
}

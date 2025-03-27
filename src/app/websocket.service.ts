import { Injectable } from '@angular/core';
import { SyncMessage } from './network';

@Injectable({
  providedIn: 'root'
})
export class WebSocketService {
  private socket: WebSocket | null = null;

  constructor() { }

  connect(url: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.socket = new WebSocket(url);

      this.socket.onopen = () => {
        console.log('WebSocket connection opened');
        resolve();
      };

      this.socket.onclose = () => {
        console.log('WebSocket connection closed');
      };

      this.socket.onerror = (error) => {
        console.error('WebSocket error:', error);
        reject(error);
      };
    });
  }

  sendMessage(message: SyncMessage): void {
    if (!this.socket) {
      throw new Error('WebSocket is not initialized')
    }
    if (this.socket.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket is not initialized, state:' + this.socket?.readyState);
    }
    console.log('[WebSocket] Sending message:', message);
    this.socket.send(JSON.stringify(message));
  }

  onMessage(callback: (message: SyncMessage) => void): void {
    if (!this.socket) {
      throw new Error('WebSocket is not initialized');
    }
    this.socket.onmessage = (event) => {
      const reader = new FileReader();
      reader.onload = () => {
        const message = JSON.parse(reader.result as string) as SyncMessage;
        console.log('[WebSocket] Receiving message:', message);
        callback(message);
      };
      reader.readAsText(event.data);
    };
  }

  close(): void {
    if (this.socket) {
      this.socket.close();
    }
  }
}
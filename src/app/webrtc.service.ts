import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class WebrtcService {
  private peerConnection: RTCPeerConnection | null = null;
  public dataChannel: RTCDataChannel | null = null;
  private socket: WebSocket | null = null;

  constructor() {
    this.connectToWebSocket();
  }

  private connectToWebSocket(): void {
    this.socket = new WebSocket('ws://localhost:8080');

    this.socket.onmessage = (event) => {
      const message = JSON.parse(event.data);
      if (message.type === 'offer') {
        this.createAnswer(message);
      } else if (message.type === 'answer') {
        this.setRemoteDescription(message);
      } else if (message.type === 'candidate') {
        this.addIceCandidate(message.candidate);
      }
    };
  }

  async createPeerConnection(): Promise<void> {
    this.peerConnection = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' }
      ]
    });

    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate && this.socket) {
        this.socket.send(JSON.stringify({ type: 'candidate', candidate: event.candidate }));
      }
    };

    this.peerConnection.ondatachannel = (event) => {
      this.dataChannel = event.channel;
      this.setupDataChannel();
    };

    this.dataChannel = this.peerConnection.createDataChannel('dataChannel');
    this.setupDataChannel();
  }

  private setupDataChannel(): void {
    if (this.dataChannel) {
      this.dataChannel.onopen = () => {
        console.log('Data channel is open');
      };

      this.dataChannel.onmessage = (event) => {
        console.log('Received message:', event.data);
      };

      this.dataChannel.onclose = () => {
        console.log('Data channel is closed');
      };
    }
  }

  async createOffer(): Promise<RTCSessionDescriptionInit> {
    if (!this.peerConnection) {
      await this.createPeerConnection();
    }
    const offer = await this.peerConnection!.createOffer();
    await this.peerConnection!.setLocalDescription(offer);
    if (this.socket) {
      this.socket.send(JSON.stringify(offer));
    }
    return offer;
  }

  async createAnswer(offer: RTCSessionDescriptionInit): Promise<RTCSessionDescriptionInit> {
    if (!this.peerConnection) {
      await this.createPeerConnection();
    }
    await this.peerConnection!.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await this.peerConnection!.createAnswer();
    await this.peerConnection!.setLocalDescription(answer);
    if (this.socket) {
      this.socket.send(JSON.stringify(answer));
    }
    return answer;
  }

  async setRemoteDescription(answer: RTCSessionDescriptionInit): Promise<void> {
    if (this.peerConnection) {
      await this.peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
    }
  }

  async addIceCandidate(candidate: RTCIceCandidateInit): Promise<void> {
    if (this.peerConnection) {
      await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
    }
  }

  sendMessage(message: string): void {
    if (this.dataChannel) {
      console.log('Data channel state:', this.dataChannel.readyState);
      if (this.dataChannel.readyState === 'open') {
        this.dataChannel.send(message);
        console.log('Message sent:', message);
      } else {
        console.log('Data channel is not open, waiting...');
        this.dataChannel.onopen = () => {
          console.log('Data channel is now open');
          this.dataChannel!.send(message);
          console.log('Message sent:', message);
        };
      }
    } else {
      console.log('Data channel is not initialized');
    }
  }
}
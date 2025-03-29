import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { generateSessionId, Role, SyncMessage } from '../definitions/network';
import { WebRTCControllerService } from './web-rtc-controller.service';
import { WebRTCHostService } from './web-rtc-host.service';
import { WebSocketService } from './websocket.service';

@Injectable({
  providedIn: 'root'
})
export class NetworkService {
  public sessionId: string = '';
  public peerIdHost: string = '';
  public peerIdSelf: string = '';
  public role?: Role;

  constructor(
    private webRTCControllerService: WebRTCControllerService,
    private webRTCHostService: WebRTCHostService,
    private websocketService: WebSocketService
  ) { }

  initHost(): void {
    let role: Role = 'Host';
    this.role = role;
    this.sessionId = generateSessionId();
    this.peerIdHost = generateSessionId();
    this.sessionId = "session1"; // FIXME
    this.peerIdSelf = this.peerIdHost;

    this.websocketService.connect('ws://192.168.1.69:8080').then(() => {
      const initMessage: SyncMessage = { type: 'init', role: role, sessionId: this.sessionId, peerId: this.peerIdHost };
      this.websocketService.sendMessage(initMessage);
    });

    this.websocketService.onMessage((message) => {
      if (this.role !== role || message.type !== 'WebRPC' || !message.content) {
        throw Error('Invalid message');
      }
      switch (message.content.type) {
        case 'offer':
          if (!message.content.sdp) {
            throw Error('Invalid offer');
          }
          this.webRTCHostService.initializeConnection(message.peerId, (peerId, candidate) => {
            this.sendIceCandidate(peerId, candidate);
          });
          this.webRTCHostService.createAnswer(message.peerId, message.content.sdp).then((answer) => {
            const resp: SyncMessage = { role: role, type: 'WebRPC', peerId: this.peerIdHost, sessionId: this.sessionId, content: { type: 'answer', sdp: answer } };
            this.websocketService.sendMessage(resp);
          });
          break;
        case 'candidate':
          if (!message.content.candidate) {
            throw Error('Invalid candidate');
          }
          this.webRTCHostService.addIceCandidate(message.peerId, message.content.candidate).then(() => { });
          break;
      }
    });
  }

  async initController(sessionId: string): Promise<void> {
    let role: Role = 'Controller';
    this.role = role;
    this.sessionId = sessionId;
    this.peerIdSelf = generateSessionId();

    await this.websocketService.connect(environment.urlSignalingServer);

    this.webRTCControllerService.initialize((candidate) => {
      const sysMessage: SyncMessage = {
        type: 'WebRPC',
        role: role,
        sessionId: this.sessionId,
        peerId: this.peerIdSelf,
        content: {
          type: 'candidate',
          candidate: candidate,
        }
      };
      this.websocketService.sendMessage(sysMessage);
    });

    this.websocketService.onMessage((message) => {
      if (this.role !== role || message.type !== 'WebRPC' || !message.content) {
        throw Error('Invalid message');
      }
      switch (message.content.type) {
        case 'answer':
          if (!message.content.sdp) {
            throw Error('Invalid answer');
          }
          this.peerIdHost = message.peerId;
          this.webRTCControllerService.setRemoteDescription(message.content.sdp);
          break;
        case 'candidate':
          if (!message.content.candidate) {
            throw Error('Invalid candidate');
          }
          this.webRTCControllerService.addIceCandidate(message.content.candidate).then(() => { });
          break;
      }
    });
  }

  sendOffer(): void {
    if (this.role !== 'Controller') {
      throw Error('Only controller can create offer');
    }
    this.webRTCControllerService.createOffer().then((offer) => {
      const sysMessage: SyncMessage = { type: 'WebRPC', role: 'Controller', sessionId: this.sessionId, peerId: this.peerIdSelf, content: { type: 'offer', sdp: offer } };
      this.websocketService.sendMessage(sysMessage);
    });
  }

  private sendIceCandidate(peerId: string, candidate: RTCIceCandidate): void {
    const sysMessage: SyncMessage = {
      type: 'WebRPC',
      role: this.role!,
      sessionId: this.sessionId,
      peerId: this.peerIdSelf,
      content: {
        type: 'candidate',
        candidate: candidate,
      }
    };
    this.websocketService.sendMessage(sysMessage);
  }

  sendMessage(peerId: string, autoprefix: boolean, message: string): void {
    if (this.role === 'Host') {
      this.sendMessageToController(peerId, autoprefix, message);
    } else if (this.role === 'Controller') {
      this.sendMessageToHost(autoprefix, message);
    }
  }
  sendMessageToController(peerId: string, autoprefix: boolean, message: string): void {
    if (autoprefix) {
      message = this.peerIdHost + "/" + message;
    }
    this.webRTCHostService.sendMessage(peerId, message);
  }
  sendMessageToHost(autoprefix: boolean, message: string): void {
    if (autoprefix) {
      message = this.peerIdSelf + "/" + message;
    }
    this.webRTCControllerService.sendMessage(message);
  }
}
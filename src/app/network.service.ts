import { Injectable } from '@angular/core';
import { controllerConnectionID, Role, SyncMessage } from './network';
import { WebRTCService } from './webrtc.service';
import { WebSocketService } from './websocket.service';

@Injectable({
  providedIn: 'root'
})
export class NetworkService {
  public sessionId: string = '';
  public peerIdHost: string = '';
  public peerIdSelf: string = '';
  public receivedMessages: string[] = [];
  public role?: Role;

  constructor(
    private webRTCService: WebRTCService,
    private websocketService: WebSocketService
  ) { }

  initHost(): void {
    let role: Role = 'Host';
    this.role = role;
    this.sessionId = this.generateSessionId();
    this.peerIdHost = this.generateSessionId();
    this.sessionId = "session1" //FIXME
    this.peerIdHost = "peerHost" //FIXME
    this.peerIdSelf = this.peerIdHost

    this.websocketService.connect('ws://localhost:8080').then(() => {
      const initMessage: SyncMessage = { type: 'init', role: role, sessionId: this.sessionId, peerId: this.peerIdHost };
      this.websocketService.sendMessage(initMessage);
    });


    this.websocketService.onMessage((message) => {
      if (this.role != role || message.type !== 'WebRPC' || !message.content) {
        throw Error('Invalid message');
      }
      switch (message.content.type) {
        case 'offer':
          if (!message.content.sdp) {
            throw Error('Invalid offer');
          }
          this.webRTCService.createAnswer(message.peerId, message.content.sdp, this.iceCallback(message.peerId)).then((answer) => {
            let resp: SyncMessage = { role: role, type: 'WebRPC', peerId: this.peerIdHost, sessionId: this.sessionId, content: { type: 'answer', sdp: answer } };
            this.websocketService.sendMessage(resp);
          });

          break;
        case 'answer':
          console.error('Host received answer from peer:', message);
          break;
        case 'candidate':
          if (!message.content.candidate) {
            throw Error('Invalid candidate');
          }
          this.webRTCService.addIceCandidate(controllerConnectionID, message.content.candidate).then(() => { });
          break;
      }
    });
  }



  initController(sessionId: string): void {
    let role: Role = 'Controller';
    this.role = role;
    this.sessionId = sessionId;
    this.peerIdSelf = this.generateSessionId();
    this.peerIdSelf = "peerController1" //FIXME

    this.websocketService.connect('ws://localhost:8080').then(() => { });

    this.websocketService.onMessage((message) => {
      if (this.role != role || message.type !== 'WebRPC' || !message.content) {
        throw Error('Invalid message');
      }
      switch (message.content.type) {
        case 'offer':
          console.error('[' + message.peerId + '] Controller received offer: ', message);
          break;
        case 'answer':
          if (!message.content.sdp) {
            throw Error('Invalid answer');
          }
          this.peerIdHost = message.peerId;
          this.webRTCService.setRemoteDescription(controllerConnectionID, message.content.sdp);
          break;
        case 'candidate':
          if (!message.content.candidate) {
            throw Error('Invalid candidate');
          }
          this.webRTCService.addIceCandidate(controllerConnectionID, message.content.candidate).then(() => { });
          break;
      }

    });
  }

  private generateSessionId(): string {
    return Math.random().toString(36).substr(2, 9);
  }

  sendOffer(): void {
    if (this.role !== 'Controller') {
      throw Error('Only controller can create offer');
    }
    this.webRTCService.createOffer(this.iceCallback(controllerConnectionID)).then((offer) => {
      let sysMessage: SyncMessage = { type: 'WebRPC', role: 'Controller', sessionId: this.sessionId, peerId: this.peerIdSelf, content: { type: 'offer', sdp: offer } };
      this.websocketService.sendMessage(sysMessage);
    });
  }

  private iceCallback(peerIdOther: string): (candidate: RTCIceCandidate) => void {
    return (candidate: RTCIceCandidate) => {
      //candidate was created by the browser and need to be sent to the other peer
      let sysMessage: SyncMessage = {
        type: 'WebRPC',
        role: 'Controller',
        sessionId: this.sessionId,
        peerId: this.peerIdSelf,
        content: {
          type: 'candidate',
          candidate: candidate,
        }
      };
      this.websocketService.sendMessage(sysMessage);
    };
  }


  sendMessageToController(peerId: string, message: string): void {
    this.webRTCService.sendMessageToController(peerId, this.peerIdHost + "/ " + message);
  }

  sendMessageToHost(message: string): void {
    this.webRTCService.sendMessageToHost(this.peerIdSelf + "/ " + message);
  }

  getReceivedMessages(): string[] {
    return this.receivedMessages;
  }
}
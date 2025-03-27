import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Role } from './network';
import { NetworkService } from './network.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  imports: [CommonModule, FormsModule]
})
export class AppComponent {
  title = 'couch-game-WebRTC';
  peerId: string = 'peerHost'; //FIXME
  message: string = '';
  sdp: string = '';
  sessionId: string = 'session1'; //FIXME
  iceCandidate: string = '';
  initialized?: Role = undefined;
  connected: boolean = false;

  constructor(public networkService: NetworkService) { }

  initController(): void {
    this.networkService.initController(this.sessionId);
    this.networkService.sendOffer();
    this.connected = true;
  }

  sendMessageToHost(): void {
    this.networkService.sendMessageToHost(this.message);
    this.message = '';
  }
  sendMessageToController(): void {
    this.networkService.sendMessageToController(this.peerId, this.message);
    this.message = '';
  }

  get receivedMessages(): string[] {
    return this.networkService.getReceivedMessages();
  }
}
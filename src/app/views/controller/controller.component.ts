import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Role } from '../../definitions/network';
import { NetworkService } from '../../services/network.service';

@Component({
  selector: 'app-controller',
  imports: [CommonModule, FormsModule],
  templateUrl: './controller.component.html',
  styleUrl: './controller.component.scss'
})
export class ControllerComponent {
  peerId: string = 'peerHost'; //FIXME
  message: string = '';
  sdp: string = '';
  sessionId: string = 'session1'; //FIXME
  iceCandidate: string = '';
  initialized?: Role = undefined;
  connected: boolean = false;

  constructor(public networkService: NetworkService) { }

  async initController(sessionId: string): Promise<void> {
    await this.networkService.initController(sessionId);
    this.networkService.sendOffer();
    this.connected = true;
  }

  sendMessage(): void {
    this.networkService.sendMessageToHost(this.message);
    this.message = '';
  }
}

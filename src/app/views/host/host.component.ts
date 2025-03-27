import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NetworkService } from '../../services/network.service';

@Component({
  selector: 'app-host',
  imports: [CommonModule, FormsModule],
  templateUrl: './host.component.html',
  styleUrl: './host.component.scss'
})
export class HostComponent {
  peerId: string = 'peerController1'; //FIXME
  message: string = '';
  sessionId: string = 'session1'; //FIXME
  connected: boolean = false;

  constructor(public networkService: NetworkService) {
    this.networkService.initHost();
  }

  sendMessage(): void {
    this.networkService.sendMessageToController(this.peerId, this.message);
    this.message = '';
  }
}

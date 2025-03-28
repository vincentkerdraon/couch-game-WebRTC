import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NetworkService } from '../../services/network.service';
import { WebRTCService } from '../../services/web-rtc.service';
import { TrafficReceiveComponent } from "../traffic-receive/traffic-receive.component";
import { TrafficSendComponent } from "../traffic-send/traffic-send.component";

@Component({
  selector: 'app-host',
  imports: [CommonModule, FormsModule, TrafficReceiveComponent, TrafficSendComponent],
  templateUrl: './host.component.html',
  styleUrl: './host.component.scss'
})
export class HostComponent {
  peerId: string = 'peerController1'; //FIXME
  message: string = '';
  sessionId: string = 'session1'; //FIXME
  connected: boolean = false;
  lastMessage: string = '';

  constructor(public networkService: NetworkService, private webrtcService: WebRTCService) {
    this.networkService.initHost();
    webrtcService.messages$.subscribe((trafficData) => {
      if (!trafficData) {
        return
      }
      if (!trafficData.content.startsWith(".")) {
        this.lastMessage = trafficData.content;
      }
    });
  }

  sendMessage(): void {
    this.networkService.sendMessageToController(this.peerId, this.message);
    this.message = '';
  }
}

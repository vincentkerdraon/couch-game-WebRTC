import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ConnectionStatuses } from '../../definitions/network';
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
  peerId: string = '';
  message: string = '';
  sessionId: string = '';
  connected: boolean = false;
  lastMessage: string = '';
  statuses: ConnectionStatuses[] = [];

  constructor(public networkService: NetworkService, private webrtcService: WebRTCService) {
    webrtcService.connectionStatuses$.subscribe((status) => {
      // link to statuses by status.peerId
      for (let i = 0; i < this.statuses.length; i++) {
        if (this.statuses[i].peerId === status.peerId) {
          this.statuses[i] = status;
          return;
        }
      }
      this.statuses.push(status);
    });

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

  sendMessage(peerId: string): void {
    this.networkService.sendMessageToController(peerId, true, this.message);
    this.message = '';
  }
}

import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Role } from '../../definitions/network';
import { NetworkService } from '../../services/network.service';
import { WebRTCService } from '../../services/web-rtc.service';
import { TrafficReceiveComponent } from "../traffic-receive/traffic-receive.component";
import { TrafficSendComponent } from "../traffic-send/traffic-send.component";

@Component({
  selector: 'app-controller',
  imports: [CommonModule, FormsModule, TrafficReceiveComponent, TrafficSendComponent],
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
  lastMessage: string = '';


  constructor(public networkService: NetworkService, private webrtcService: WebRTCService) {
    webrtcService.messages$.subscribe((trafficData) => {
      if (!trafficData) {
        return
      }
      if (!trafficData.content.startsWith(".")) {
        this.lastMessage = trafficData.content;
      }
    });
  }

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

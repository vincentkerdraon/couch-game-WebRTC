import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { environment } from '../../../environments/environment';
import { NetworkService } from '../../services/network.service';
import { WebRTCService } from '../../services/web-rtc.service';
import { QRCodeWrapperComponent } from '../qr-code-wrapper/qr-code-wrapper.component';
import { TrafficReceiveComponent } from "../traffic-receive/traffic-receive.component";
import { TrafficSendComponent } from "../traffic-send/traffic-send.component";

@Component({
  selector: 'app-host',
  imports: [CommonModule, FormsModule, TrafficReceiveComponent, TrafficSendComponent, QRCodeWrapperComponent],
  templateUrl: './host.component.html',
  styleUrl: './host.component.scss'
})
export class HostComponent {
  peerId: string = '';
  message: string = '';
  sessionId: string = '';
  connected: boolean = false;
  lastMessage: string = '';
  private subscriptionMessages: Subscription;
  qrCodeUrl: string = ''
  urlSignalingServer: string = environment.urlSignalingServer;

  constructor(public networkService: NetworkService, public webrtcService: WebRTCService) {
    this.networkService.initHost();
    this.qrCodeUrl = environment.urlSelf + `/controller?sessionId=${this.networkService.sessionId}`;

    this.subscriptionMessages = webrtcService.messages$.subscribe((trafficData) => {
      if (!trafficData) {
        return
      }
      if (!trafficData.content.startsWith(".")) {
        this.lastMessage = trafficData.content;
      }
    });
  }

  ngOnDestroy() {
    this.subscriptionMessages.unsubscribe();
  }

  sendMessage(peerId: string): void {
    this.networkService.sendMessageToController(peerId, true, this.message);
    this.message = '';
  }
}

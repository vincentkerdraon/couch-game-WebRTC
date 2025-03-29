import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs';
import { ConnectionStatuses } from '../../definitions/network';
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
  message: string = '';
  sessionId: string | null = null;
  lastMessage: string = '';
  status?: ConnectionStatuses;
  private subscriptionMessages: Subscription;
  private subscriptionConnectionStatuses: Subscription;

  constructor(public networkService: NetworkService, private webrtcService: WebRTCService, private cdr: ChangeDetectorRef, private route: ActivatedRoute) {
    this.route.queryParamMap.subscribe((params) => {
      this.sessionId = params.get('sessionId');
      console.log('Detected sessionId:', this.sessionId);
    });

    this.subscriptionMessages = webrtcService.messages$.subscribe((trafficData) => {
      if (!trafficData) {
        return
      }
      if (!trafficData.content.startsWith(".")) {
        this.lastMessage = trafficData.content;
      }
    });

    if (webrtcService.statuses.length > 0) {
      this.status = webrtcService.statuses[0];
    }
    this.subscriptionConnectionStatuses = webrtcService.connectionStatuses$.subscribe((status) => {
      console.log("ControllerComponent connectionStatuses status=", status);
      this.status = status;
      this.cdr.detectChanges();
    });
  }

  ngOnDestroy() {
    this.subscriptionMessages.unsubscribe();
    this.subscriptionConnectionStatuses.unsubscribe();
  }

  async initController(sessionId: string | null): Promise<void> {
    if (!sessionId) {
      throw new Error('Session ID is required');
    }
    await this.networkService.initController(sessionId);
    this.networkService.sendOffer();
  }

  sendMessage(): void {
    this.networkService.sendMessageToHost(true, this.message);
    this.message = '';
  }
}

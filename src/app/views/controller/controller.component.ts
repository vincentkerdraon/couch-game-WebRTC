import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ConnectionStatuses } from '../../definitions/network';
import { NetworkService } from '../../services/network.service';
import { WakeLockService } from '../../services/wake-lock.service';
import { WebRTCService } from '../../services/web-rtc.service';
import { WebSocketService } from '../../services/websocket.service';
import { SquareControlComponent } from "../square-control/square-control.component";
import { SquareComponent } from "../square/square.component";
import { TrafficReceiveComponent } from "../traffic-receive/traffic-receive.component";
import { TrafficSendComponent } from "../traffic-send/traffic-send.component";

@Component({
  selector: 'app-controller',
  imports: [CommonModule, FormsModule, TrafficReceiveComponent, TrafficSendComponent, SquareComponent, SquareControlComponent],
  templateUrl: './controller.component.html',
})

export class ControllerComponent implements OnInit, OnDestroy {
  message: string = '';
  sessionId: string | null = null;
  lastMessage: string = '';
  status?: ConnectionStatuses;
  private subscriptionMessages: Subscription;
  private subscriptionConnectionStatuses: Subscription;
  urlSignalingServer: string = environment.urlSignalingServer;

  constructor(public networkService: NetworkService, private webrtcService: WebRTCService, private cdr: ChangeDetectorRef, private route: ActivatedRoute, public websocketService: WebSocketService, private wakeLockService: WakeLockService) {
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

  ngOnInit(): void {
    this.wakeLockService.requestWakeLock();
  }

  ngOnDestroy() {
    this.subscriptionMessages.unsubscribe();
    this.subscriptionConnectionStatuses.unsubscribe();
    this.wakeLockService.releaseWakeLock();
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
    this.cdr.detectChanges();
  }
}

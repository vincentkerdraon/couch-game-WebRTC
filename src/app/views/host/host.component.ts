import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { environment } from '../../../environments/environment';
import { NetworkService } from '../../services/network.service';
import { NotificationService } from '../../services/notification.service';
import { WakeLockService } from '../../services/wake-lock.service';
import { WebRTCService } from '../../services/web-rtc.service';
import { WebSocketService } from '../../services/websocket.service';
import { QRCodeWrapperComponent } from '../qr-code-wrapper/qr-code-wrapper.component';
import { SquareControlComponent } from "../square-control/square-control.component";
import { SquareComponent } from "../square/square.component";
import { TrafficReceiveComponent } from "../traffic-receive/traffic-receive.component";
import { TrafficSendComponent } from "../traffic-send/traffic-send.component";

@Component({
  selector: 'app-host',
  imports: [CommonModule, FormsModule, TrafficReceiveComponent, TrafficSendComponent, QRCodeWrapperComponent, SquareComponent, SquareControlComponent],
  templateUrl: './host.component.html',
})
export class HostComponent implements OnInit, OnDestroy {
  peerId: string = '';
  message: string = '';
  sessionId: string = '';
  connected: boolean = false;
  lastMessage: string = '';
  private subscriptionMessages: Subscription;
  qrCodeUrl: string = ''
  urlSignalingServer: string = environment.urlSignalingServer;

  constructor(public networkService: NetworkService, public webrtcService: WebRTCService, private cdr: ChangeDetectorRef, public websocketService: WebSocketService, private notificationService: NotificationService, private wakeLockService: WakeLockService) {
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

  ngOnInit(): void {
    this.wakeLockService.requestWakeLock();
  }

  ngOnDestroy() {
    this.subscriptionMessages.unsubscribe();
    this.wakeLockService.releaseWakeLock();
  }



  sendMessage(peerId: string): void {
    this.networkService.sendMessageToController(peerId, true, this.message);
    this.message = '';
    this.cdr.detectChanges();
  }

  copyToClipboard(s: string) {
    this.notificationService.showMessage('info', 'Copied to clipboard');
    navigator.clipboard.writeText(s).then(() => {
      console.log('copied to clipboard');
    }).catch(err => {
      console.error('Could not copy: ', err);
    });
  }
}

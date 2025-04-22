import { CommonModule } from '@angular/common';
import { AfterViewInit, ChangeDetectorRef, Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
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
export class HostComponent implements OnInit, OnDestroy, AfterViewInit {
  peerId: string = '';
  message: string = '';
  sessionId: string = '';
  connected: boolean = false;
  lastMessage: string = '';
  private subscriptionMessages: Subscription;
  qrCodeUrl: string = ''
  urlSignalingServer: string = environment.urlSignalingServer;
  public localStream: MediaStream | null = null;
  public remoteStream: MediaStream | null = null;
  private subscriptionRemoteStream: Subscription;

  @ViewChild('localVideo') localVideoRef!: ElementRef<HTMLVideoElement>;
  @ViewChild('remoteVideo') remoteVideoRef!: ElementRef<HTMLVideoElement>;

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

    this.subscriptionRemoteStream = this.webrtcService.remoteStream$.subscribe((stream) => {
      this.remoteStream = stream;
      this.cdr.detectChanges();
    });
    this.webrtcService.getUserMedia().then((stream) => {
      this.localStream = stream;
      this.cdr.detectChanges();
    });
  }

  ngOnInit(): void {
    this.wakeLockService.requestWakeLock();
  }

  ngAfterViewInit(): void {
    if (this.localStream && this.localVideoRef) {
      this.localVideoRef.nativeElement.srcObject = this.localStream;
    }
    if (this.remoteStream && this.remoteVideoRef) {
      this.remoteVideoRef.nativeElement.srcObject = this.remoteStream;
    }
    // Subscribe to stream changes
    this.webrtcService.remoteStream$.subscribe((stream) => {
      if (this.remoteVideoRef) {
        this.remoteVideoRef.nativeElement.srcObject = stream;
      }
    });
    this.webrtcService.getUserMedia().then((stream) => {
      if (this.localVideoRef) {
        this.localVideoRef.nativeElement.srcObject = stream;
      }
    });
  }

  ngOnDestroy() {
    this.subscriptionMessages.unsubscribe();
    this.subscriptionRemoteStream.unsubscribe();
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

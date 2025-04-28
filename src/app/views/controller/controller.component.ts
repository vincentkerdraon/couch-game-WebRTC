import { CommonModule } from '@angular/common';
import { AfterViewChecked, AfterViewInit, ChangeDetectorRef, Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
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

export class ControllerComponent implements OnInit, OnDestroy, AfterViewInit, AfterViewChecked {
  message: string = '';
  sessionId: string | null = null;
  lastMessage: string = '';
  status?: ConnectionStatuses;
  public localStream: MediaStream | null = null;
  public remoteStream: MediaStream | null = null;
  private subscriptionMessages: Subscription;
  private subscriptionConnectionStatuses: Subscription;
  private subscriptionRemoteStream!: Subscription;
  urlSignalingServer: string = environment.urlSignalingServer;

  @ViewChild('localVideo') localVideoRef!: ElementRef<HTMLVideoElement>;
  @ViewChild('remoteVideo', { static: false }) remoteVideoRef!: ElementRef<HTMLVideoElement>;

  private latestRemoteStream: MediaStream | null = null;
  private latestLocalStream: MediaStream | null = null;

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

    this.webrtcService.getUserMedia().then((stream) => {
      console.log('[ControllerComponent] Local stream fetched:', stream);
      console.log('[ControllerComponent] Local stream video tracks:', stream.getVideoTracks());
      this.localStream = stream;
      this.latestLocalStream = stream;
      this.cdr.detectChanges();
    }).catch((error) => {
      console.error('[ControllerComponent] Failed to fetch local stream:', error);
    });
  }

  ngOnInit(): void {
    this.wakeLockService.requestWakeLock();
  }

  ngAfterViewInit(): void {
    console.log('[ControllerComponent] ngAfterViewInit called');
    // Set local video only if available
    if (this.localStream && this.localVideoRef) {
      this.localVideoRef.nativeElement.srcObject = this.localStream;
      this.localVideoRef.nativeElement.muted = true; // Ensure local video is always muted
    }
    // Debug: log remoteVideoRef
    console.log('[ControllerComponent] remoteVideoRef:', this.remoteVideoRef);
    // Subscribe to remote stream changes and log
    this.webrtcService.remoteStream$.subscribe((stream) => {
      console.log('[ControllerComponent] Received remote stream:', stream);
      console.log('[ControllerComponent] Remote stream video tracks:', stream.getVideoTracks());
      this.latestRemoteStream = stream;
      this.cdr.detectChanges();
    });
    // Set local stream reference for ngAfterViewChecked
    this.latestLocalStream = this.localStream;
  }

  ngAfterViewChecked(): void {
    // Attach local stream to local video element if both are available
    if (this.localVideoRef && this.latestLocalStream) {
      if (this.localVideoRef.nativeElement.srcObject !== this.latestLocalStream) {
        this.localVideoRef.nativeElement.srcObject = this.latestLocalStream;
        this.localVideoRef.nativeElement.muted = true; // Ensure local video is always muted
        this.localVideoRef.nativeElement.load();
        setTimeout(() => {
          console.log('[ControllerComponent] localVideoRef videoWidth:', this.localVideoRef.nativeElement.videoWidth, 'videoHeight:', this.localVideoRef.nativeElement.videoHeight);
        }, 1000);
      }
    }
    // Attach remote stream to video element if both are available
    if (this.remoteVideoRef && this.latestRemoteStream) {
      if (this.remoteVideoRef.nativeElement.srcObject !== this.latestRemoteStream) {
        this.remoteVideoRef.nativeElement.srcObject = this.latestRemoteStream;
        this.remoteVideoRef.nativeElement.load();
        setTimeout(() => {
          console.log('[ControllerComponent] remoteVideoRef videoWidth:', this.remoteVideoRef.nativeElement.videoWidth, 'videoHeight:', this.remoteVideoRef.nativeElement.videoHeight);
        }, 1000);
      }
    }
  }

  ngOnDestroy() {
    this.subscriptionMessages.unsubscribe();
    this.subscriptionConnectionStatuses.unsubscribe();
    this.subscriptionRemoteStream.unsubscribe();
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

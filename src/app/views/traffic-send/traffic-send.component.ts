import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { NetworkService } from '../../services/network.service';
import { WebRTCService } from '../../services/web-rtc.service';

@Component({
  selector: 'app-traffic-send',
  imports: [CommonModule, FormsModule],
  templateUrl: './traffic-send.component.html',
})
export class TrafficSendComponent {
  peerId: string = "";
  charsPerMessage: number = 1000;
  messagesPerSecond: number = 10;
  activated: boolean = false;
  private intervalId: any;
  latencyMS: number = 0;
  peerConnected: boolean = false;
  peerConnectedAtLeastOne: boolean = false;
  private subscriptionConnectionStatuses: Subscription;


  constructor(public networkService: NetworkService, public webrtcService: WebRTCService, private cdr: ChangeDetectorRef) {
    this.subscriptionConnectionStatuses = webrtcService.connectionStatuses$.subscribe((status) => {
      console.log("TrafficSendComponent connectionStatuses status=", status);
      this.update();
      this.cdr.detectChanges();
    });
    this.update();
  }


  ngOnDestroy() {
    this.subscriptionConnectionStatuses.unsubscribe();
  }

  public update() {
    this.peerConnectedAtLeastOne = false
    this.webrtcService.statuses.forEach((s) => {
      if (s.connectionStatus == "connected") {
        this.peerConnectedAtLeastOne = true
      }
      if (this.peerId == "") {
        this.peerId = s.peerId;
      }
    });

    this.peerConnected = false;
    this.webrtcService.statuses.forEach((status) => {
      if (status.peerId === this.peerId) {
        this.peerConnected = (status.connectionStatus == "connected");
      }
    });

    clearInterval(this.intervalId);
    if (!this.activated) return;
    if (this.peerId === "") return;
    if (this.charsPerMessage <= 0) return;
    if (this.messagesPerSecond <= 0) return;
    this.intervalId = setInterval(() => {
      const msg = '.'.repeat(this.charsPerMessage);
      this.networkService.sendMessage(this.peerId, false, msg);
    }, 1000 / this.messagesPerSecond);
  }


  testLatency() {
    let now = performance.now();
    const msg = ".testLatencyPing=" + now;
    const msgExpected = ".testLatencyPong=" + now;
    this.networkService.sendMessage(this.peerId, false, msg);
    const subscription = this.webrtcService.messages$.subscribe((trafficData) => {
      if (!trafficData) {
        return;
      }
      if (trafficData.content == msgExpected) {
        this.latencyMS = (performance.now() - now);
        subscription.unsubscribe();
      }
    });
  }
}

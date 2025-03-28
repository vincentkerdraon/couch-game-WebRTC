import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ConnectionStatuses } from '../../definitions/network';
import { NetworkService } from '../../services/network.service';
import { WebRTCService } from '../../services/web-rtc.service';

@Component({
  selector: 'app-traffic-send',
  imports: [CommonModule, FormsModule],
  templateUrl: './traffic-send.component.html',
  styleUrl: './traffic-send.component.scss'
})
export class TrafficSendComponent {
  peerId: string = "";
  bitsPerMessage: number = 1000;
  messagesPerSecond: number = 10;
  activated: boolean = false;
  private intervalId: any;
  latencyMS: number = 0;
  statuses: ConnectionStatuses[] = [];
  peerConnected: boolean = false;
  peerConnectedAtLeastOne: boolean = false;


  constructor(public networkService: NetworkService, private webrtcService: WebRTCService) {
    webrtcService.connectionStatuses$.subscribe((status) => {
      let f = false;
      for (let i = 0; i < this.statuses.length; i++) {
        if (this.statuses[i].peerId === status.peerId) {
          this.statuses[i] = status;
          f = true;
          break;
        }
      }
      if (!f) { this.statuses.push(status); }


      this.peerConnectedAtLeastOne = false
      this.statuses.forEach((s) => {
        if (s.connectionStatus == "connected") {
          this.peerConnectedAtLeastOne = true
        }
        if (this.peerId == "") {
          this.peerId = s.peerId;
        }
      });

      this.update();
    });


  }

  public update() {
    this.peerConnected = false;
    this.statuses.forEach((status) => {
      if (status.peerId === this.peerId) {
        this.peerConnected = (status.connectionStatus == "connected");
      }
    });

    clearInterval(this.intervalId);
    if (!this.activated) return;
    if (this.peerId === "") return;
    if (this.bitsPerMessage <= 0) return;
    if (this.messagesPerSecond <= 0) return;
    this.intervalId = setInterval(() => {
      const msg = '.'.repeat(this.bitsPerMessage);
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

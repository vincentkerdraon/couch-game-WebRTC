import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NetworkService } from '../../services/network.service';
import { WebRTCService } from '../../services/web-rtc.service';

@Component({
  selector: 'app-traffic-send',
  imports: [CommonModule, FormsModule],
  templateUrl: './traffic-send.component.html',
  styleUrl: './traffic-send.component.scss'
})
export class TrafficSendComponent {
  peerID: string = "";
  bitsPerMessage: number = 1000;
  messagesPerSecond: number = 10;
  activated: boolean = false;
  private intervalId: any;
  latencyMS: number = 0;

  constructor(public networkService: NetworkService, private webrtcService: WebRTCService) { }

  public update() {
    clearInterval(this.intervalId);
    if (!this.activated) return;
    if (this.peerID === "") return;
    if (this.bitsPerMessage <= 0) return;
    if (this.messagesPerSecond <= 0) return;
    this.intervalId = setInterval(() => {
      const message = '.'.repeat(this.bitsPerMessage);
      this.sendMessage(this.peerID, message);
    }, 1000 / this.messagesPerSecond);
  }

  private sendMessage(peerId: string, message: string) {
    this.networkService.sendMessage(peerId, message);
  }

  testLatency() {
    let now = performance.now();
    const msg = "testLatencyPing=" + now;
    this.sendMessage(this.peerID, msg);
    const subscription = this.webrtcService.messages$.subscribe((trafficData) => {
      if (!trafficData) {
        return;
      }
      if (trafficData.content.includes("testLatencyPong=" + now)) {
        this.latencyMS = (performance.now() - now);
        subscription.unsubscribe();
      }
    });
  }
}

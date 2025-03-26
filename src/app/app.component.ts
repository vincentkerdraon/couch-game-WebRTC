import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { WebrtcService } from './webrtc.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  imports: [CommonModule, FormsModule]
})
export class AppComponent {
  title = 'couch-game-WebRTC';
  message: string = '';
  receivedMessages: string[] = [];
  sdp: string = '';
  iceCandidate: string = '';

  constructor(private webrtcService: WebrtcService) {
    this.webrtcService.createPeerConnection();
    if (this.webrtcService.dataChannel) {
      this.webrtcService.dataChannel.onmessage = (event) => {
        this.receivedMessages.push(event.data);
      };
    }

  }

  createOffer(): void {
    this.webrtcService.createOffer().then((offer) => {
      console.log('Offer created:', offer);
      this.sdp = JSON.stringify(offer);
    });
  }

  handleSdp(): void {
    const sdp = JSON.parse(this.sdp);
    if (sdp.type === 'offer') {
      this.webrtcService.createAnswer(sdp).then((answer) => {
        console.log('Answer created:', answer);
        this.sdp = JSON.stringify(answer);
      });
    } else if (sdp.type === 'answer') {
      this.webrtcService.setRemoteDescription(sdp).then(() => {
        console.log('Remote description set:', sdp);
      });
    }
  }

  handleIceCandidate(): void {
    const candidate: RTCIceCandidateInit = JSON.parse(this.iceCandidate);
    this.webrtcService.addIceCandidate(candidate).then(() => {
      console.log('ICE candidate added:', candidate);
    });
  }

  sendMessage(): void {
    this.webrtcService.sendMessage(this.message);
    this.message = '';
  }
}
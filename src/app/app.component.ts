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
  offer: string = '';

  constructor(private webrtcService: WebrtcService) {
    this.webrtcService.createPeerConnection();
    if (this.webrtcService.dataChannel != null) {
      this.webrtcService.dataChannel.onmessage = (event) => {
        this.receivedMessages.push(event.data);
      };
    }

  }

  createOffer(): void {
    this.webrtcService.createOffer().then((offer) => {
      console.log('Offer created:', offer);
    });
  }

  handleOffer(): void {
    const message = JSON.parse(this.offer);
    if (message.type === 'offer') {
      this.createAnswer(message);
    } else if (message.type === 'answer') {
      this.setRemoteDescription(message);
    } else if (message.type === 'candidate') {
      this.addIceCandidate(message.candidate);
    }
  }

  createAnswer(offer: RTCSessionDescriptionInit): void {
    this.webrtcService.createAnswer(offer).then((answer) => {
      console.log('Answer created:', answer);
    });
  }

  setRemoteDescription(answer: RTCSessionDescriptionInit): void {
    this.webrtcService.setRemoteDescription(answer).then(() => {
      console.log('Remote description set:', answer);
    });
  }

  addIceCandidate(candidate: RTCIceCandidateInit): void {
    this.webrtcService.addIceCandidate(candidate).then(() => {
      console.log('ICE candidate added:', candidate);
    });
  }

  sendMessage(): void {
    this.webrtcService.sendMessage(this.message);
    this.message = '';
  }
}
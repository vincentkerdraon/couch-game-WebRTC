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
  answer: string = '';
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
      this.offer = JSON.stringify(offer);
    });
  }

  handleOffer(): void {
    const offer: RTCSessionDescriptionInit = JSON.parse(this.offer);
    this.webrtcService.createAnswer(offer).then((answer) => {
      console.log('Answer created:', answer);
      this.answer = JSON.stringify(answer);
    });
  }

  handleAnswer(): void {
    const answer: RTCSessionDescriptionInit = JSON.parse(this.answer);
    this.webrtcService.setRemoteDescription(answer).then(() => {
      console.log('Remote description set:', answer);
    });
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
import { Injectable } from '@angular/core';
import { WebRTCService } from './web-rtc.service';

@Injectable({
  providedIn: 'root'
})
export class WebRTCControllerService {
  private peerConnection: RTCPeerConnection | null = null;
  private dataChannel: RTCDataChannel | null = null;

  constructor(private webRTCService: WebRTCService) { }

  initialize(iceCandidateCallback: (candidate: RTCIceCandidate) => void): void {
    console.log('Initializing WebRTCControllerService');
    this.peerConnection = this.webRTCService.createPeerConnection(iceCandidateCallback);
  }

  async createOffer(): Promise<RTCSessionDescriptionInit> {
    if (!this.peerConnection) {
      throw new Error('PeerConnection is not initialized');
    }
    console.log('Creating offer in WebRTCControllerService');
    const { offer, dataChannel } = await this.webRTCService.createOffer(this.peerConnection, (candidate) => {
      console.log('ICE candidate from createOffer:', candidate);
    });
    this.dataChannel = dataChannel;
    return offer;
  }

  async setRemoteDescription(desc: RTCSessionDescriptionInit): Promise<void> {
    if (!this.peerConnection) {
      throw new Error('PeerConnection is not initialized');
    }
    console.log('Setting remote description in WebRTCControllerService');
    await this.webRTCService.setRemoteDescription(this.peerConnection, desc);
  }

  async addIceCandidate(candidate: RTCIceCandidateInit): Promise<void> {
    if (!this.peerConnection) {
      throw new Error('PeerConnection is not initialized');
    }
    console.log('Adding ICE candidate in WebRTCControllerService');
    await this.webRTCService.addIceCandidate(this.peerConnection, candidate);
  }

  sendMessage(message: string): void {
    if (!this.dataChannel) {
      throw new Error('DataChannel is not initialized');
    }
    console.log('Sending message in WebRTCControllerService');
    this.webRTCService.sendMessage(this.dataChannel, message);
  }

  setDataChannel(dataChannel: RTCDataChannel): void {
    console.log('Setting data channel in WebRTCControllerService');
    this.dataChannel = dataChannel;
    this.webRTCService.sendMessage(this.dataChannel, 'Controller connected');
  }
}
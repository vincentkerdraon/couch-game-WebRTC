import { Injectable } from '@angular/core';
import { ConnectionStatus, ConnectionStatuses } from '../definitions/network';
import { NotificationService } from './notification.service';
import { WebRTCService } from './web-rtc.service';

@Injectable({
  providedIn: 'root'
})
export class WebRTCHostService {
  private peerConnections: Map<string, RTCPeerConnection> = new Map();
  private dataChannels: Map<string, RTCDataChannel> = new Map();

  constructor(private webRTCService: WebRTCService, public notificationService: NotificationService) { }

  initializeConnection(
    peerId: string,
    iceCandidateCallback: (peerId: string, candidate: RTCIceCandidate) => void
  ): void {
    console.log(`Initializing connection for peerId: ${peerId}`);
    const peerConnection = this.webRTCService.createPeerConnection((candidate) => {
      iceCandidateCallback(peerId, candidate);
    });
    peerConnection.oniceconnectionstatechange = () => {
      console.log(`ICE connection state: ${peerConnection?.iceConnectionState}`);
      const status: ConnectionStatus = peerConnection?.iceConnectionState as ConnectionStatus;
      const connStatus: ConnectionStatuses = { connectionStatus: status, peerId: peerId };
      this.webRTCService.updateStatutes(connStatus);
      this.webRTCService.connectionStatuses$.next(connStatus);

      if (status === 'connected') {
        this.notificationService.showMessage('info', 'Connected to controller: ' + peerId);
      } else if (status === 'disconnected') {
        this.notificationService.showMessage('danger', 'Disconnected from controller: ' + peerId);
      }
    };

    peerConnection.ondatachannel = (event) => {
      console.log(`Data channel received for peerId: ${peerId}`);
      this.dataChannels.set(peerId, event.channel);
      this.webRTCService.sendMessage(event.channel, 'Host connected');
    };

    this.peerConnections.set(peerId, peerConnection);
  }

  async createAnswer(peerId: string, offer: RTCSessionDescriptionInit): Promise<RTCSessionDescriptionInit> {
    const peerConnection = this.peerConnections.get(peerId);
    if (!peerConnection) {
      throw new Error(`PeerConnection not found for peerId: ${peerId}`);
    }
    peerConnection.ondatachannel = (event) => {
      console.log(`[${peerId}] ondatachannel`);
      this.webRTCService.setupDataChannel(peerId, event.channel);
      this.dataChannels.set(peerId, event.channel);
    };

    console.log(`Creating answer for peerId: ${peerId}`);
    return this.webRTCService.createAnswer(peerConnection, offer, (candidate) => {
      console.log(`ICE candidate for peerId: ${peerId}`, candidate);
    });
  }

  async setRemoteDescription(peerId: string, desc: RTCSessionDescriptionInit): Promise<void> {
    const peerConnection = this.peerConnections.get(peerId);
    if (!peerConnection) {
      throw new Error(`PeerConnection not found for peerId: ${peerId}`);
    }
    console.log(`Setting remote description for peerId: ${peerId}`);
    await this.webRTCService.setRemoteDescription(peerConnection, desc);
  }

  async addIceCandidate(peerId: string, candidate: RTCIceCandidateInit): Promise<void> {
    const peerConnection = this.peerConnections.get(peerId);
    if (!peerConnection) {
      throw new Error(`PeerConnection not found for peerId: ${peerId}`);
    }
    console.log(`Adding ICE candidate for peerId: ${peerId}`);
    await this.webRTCService.addIceCandidate(peerConnection, candidate);
  }

  sendMessage(peerId: string, message: string): void {
    const dataChannel = this.dataChannels.get(peerId);
    if (!dataChannel) {
      throw new Error(`DataChannel not found for peerId: ${peerId}`);
    }
    // console.log(`Sending message to peerId: ${peerId}`);
    this.webRTCService.sendMessage(dataChannel, message);
  }

  closeConnection(peerId: string): void {
    const peerConnection = this.peerConnections.get(peerId);
    const dataChannel = this.dataChannels.get(peerId);

    if (dataChannel) {
      console.log(`Closing data channel for peerId: ${peerId}`);
      dataChannel.close();
      this.dataChannels.delete(peerId);
    }

    if (peerConnection) {
      console.log(`Closing peer connection for peerId: ${peerId}`);
      peerConnection.close();
      this.peerConnections.delete(peerId);
    }
  }
}
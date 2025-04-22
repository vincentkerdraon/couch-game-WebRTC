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
  public localStream: MediaStream | null = null;
  private pendingCandidates: Map<string, RTCIceCandidateInit[]> = new Map();

  constructor(private webRTCService: WebRTCService, public notificationService: NotificationService) { }

  async initializeConnection(
    peerId: string,
    iceCandidateCallback: (peerId: string, candidate: RTCIceCandidate) => void
  ): Promise<void> {
    if (this.peerConnections.has(peerId)) {
      // Already initialized
      return;
    }
    const stream = await this.webRTCService.getUserMedia();
    this.localStream = stream;
    const peerConnection = this.webRTCService.createPeerConnection((candidate) => {
      iceCandidateCallback(peerId, candidate);
    }, (event) => {
      if (event.streams && event.streams[0]) {
        this.webRTCService.remoteStream$.next(event.streams[0]);
      }
    });
    // Add host's local tracks to the peer connection, but avoid duplicates
    if (this.localStream) {
      const existingSenders = peerConnection.getSenders();
      this.localStream.getTracks().forEach(track => {
        const alreadyAdded = existingSenders.some(sender => sender.track === track);
        if (!alreadyAdded) {
          peerConnection.addTrack(track, this.localStream!);
        }
      });
    }
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
    // Do not apply ICE candidates here; only after remote description is set
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
    await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
    await this.applyPendingCandidates(peerId);
    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);
    return answer;
  }

  private async applyPendingCandidates(peerId: string) {
    const peerConnection = this.peerConnections.get(peerId);
    if (!peerConnection) return;
    const queued = this.pendingCandidates.get(peerId) || [];
    for (const c of queued) {
      try {
        await peerConnection.addIceCandidate(new RTCIceCandidate(c));
      } catch (e) {
        console.error('Failed to add queued ICE candidate:', e);
      }
    }
    this.pendingCandidates.delete(peerId);
  }

  async setRemoteDescription(peerId: string, desc: RTCSessionDescriptionInit): Promise<void> {
    const peerConnection = this.peerConnections.get(peerId);
    if (!peerConnection) {
      throw new Error(`PeerConnection not found for peerId: ${peerId}`);
    }
    console.log(`Setting remote description for peerId: ${peerId}`);
    await peerConnection.setRemoteDescription(new RTCSessionDescription(desc));
    await this.applyPendingCandidates(peerId);
  }

  async addIceCandidate(peerId: string, candidate: RTCIceCandidateInit): Promise<void> {
    const peerConnection = this.peerConnections.get(peerId);
    if (!peerConnection || !peerConnection.currentRemoteDescription) {
      // Always queue if connection or remote description is not set yet
      if (!this.pendingCandidates.has(peerId)) {
        this.pendingCandidates.set(peerId, []);
      }
      this.pendingCandidates.get(peerId)!.push(candidate);
      return;
    }
    try {
      console.log(`Adding ICE candidate for peerId: ${peerId}`);
      await this.webRTCService.addIceCandidate(peerConnection, candidate);
    } catch (e) {
      console.error('Failed to add ICE candidate:', e);
    }
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
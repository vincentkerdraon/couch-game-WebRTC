import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';
import { ConnectionStatuses, ContentMessage, controllerConnectionID, timeNowTimestampSecond } from '../definitions/network';

@Injectable({
  providedIn: 'root'
})
export class WebRTCService {
  private pendingCandidates: Map<string, RTCIceCandidateInit[]> = new Map();

  //FIXME temporary for demo
  public messages$: Subject<ContentMessage> = new Subject<ContentMessage>();
  public connectionStatuses$: Subject<ConnectionStatuses> = new Subject<ConnectionStatuses>();
  public statuses: ConnectionStatuses[] = [];


  constructor() { }

  createPeerConnection(iceCb: (candidate: RTCIceCandidate) => void): RTCPeerConnection {
    console.log('createPeerConnection');

    const peerConnection = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
    peerConnection.onicecandidate = (event) => {
      if (!event.candidate) {
        // Null candidate indicates ICE gathering is complete
        return;
      }
      console.log('ICE candidate:', event.candidate);
      iceCb(event.candidate);
    };

    return peerConnection;
  }

  updateStatutes(status: ConnectionStatuses): void {
    let f = false;
    for (let i = 0; i < this.statuses.length; i++) {
      if (this.statuses[i].peerId === status.peerId) {
        this.statuses[i] = status;
        f = true;
        break;
      }
    }
    if (!f) { this.statuses.push(status); }
  }

  setupDataChannel(peerId: string, dataChannel: RTCDataChannel): void {
    console.log(`[${dataChannel.id}][${peerId}] Data channel setup`);

    dataChannel.onerror = (error) => {
      console.error(`[${dataChannel.id}][${peerId}] Data channel error:`, error);
    };
    dataChannel.onopen = () => {
      console.log(`[${dataChannel.id}][${peerId}] Data channel is open`);
    };
    dataChannel.onmessage = (event) => {
      // console.log(`[${dataChannel.id}][${peerId}] Received message:`, event.data);
      const s = event.data.toString()
      //special demo case, test latency
      if (s.startsWith(".testLatencyPing=")) {
        const latencyValue = s.split(".testLatencyPing=")[1];
        this.sendMessage(dataChannel, ".testLatencyPong=" + latencyValue);
      }
      this.messages$.next({ from: peerId, timestamp: timeNowTimestampSecond(), content: s });
    };
    dataChannel.onclose = () => {
      console.log(`[${dataChannel.id}][${peerId}] Data channel is closed`);
    };
  }

  async createOffer(peerConnection: RTCPeerConnection, iceCb: (candidate: RTCIceCandidate) => void): Promise<{ offer: RTCSessionDescriptionInit, dataChannel: RTCDataChannel }> {
    console.log('Creating offer');

    const dataChannel = peerConnection.createDataChannel('dataChannel');
    this.setupDataChannel(controllerConnectionID, dataChannel);

    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);
    return { offer, dataChannel };
  }

  async createAnswer(peerConnection: RTCPeerConnection, offer: RTCSessionDescriptionInit, iceCb: (candidate: RTCIceCandidate) => void): Promise<RTCSessionDescriptionInit> {
    console.log('Creating answer');
    await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);

    return answer;
  }

  async setRemoteDescription(peerConnection: RTCPeerConnection, desc: RTCSessionDescriptionInit): Promise<void> {
    console.log('Setting remote description');
    await peerConnection.setRemoteDescription(new RTCSessionDescription(desc));

    // Apply any queued ICE candidates
    const queued = this.pendingCandidates.get(controllerConnectionID) || [];
    console.log(`[${controllerConnectionID}] Applying ${queued.length} queued ICE candidates`);
    for (const c of queued) {
      console.log(`[${controllerConnectionID}] addIceCandidate (queued)`);
      await peerConnection.addIceCandidate(new RTCIceCandidate(c));
    }
    this.pendingCandidates.delete(controllerConnectionID);
  }

  async addIceCandidate(peerConnection: RTCPeerConnection, candidate: RTCIceCandidateInit): Promise<void> {
    if (!peerConnection.currentRemoteDescription) {
      console.log(`[${controllerConnectionID}] Queuing ICE candidate`);
      if (!this.pendingCandidates.has(controllerConnectionID)) {
        this.pendingCandidates.set(controllerConnectionID, []);
      }
      this.pendingCandidates.get(controllerConnectionID)?.push(candidate);
      return;
    }
    console.log(`[${controllerConnectionID}] addIceCandidate (direct)`);
    await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
  }

  sendMessage(dataChannel: RTCDataChannel, message: string): void {
    if (dataChannel.readyState === 'open') {
      dataChannel.send(message);
      // console.log(`[${dataChannel.id}] Message sent:`, message);
    } else {
      console.log(`[${dataChannel.id}] Data channel is not open, state:`, dataChannel.readyState);
      dataChannel.onopen = () => {
        console.log(`[${dataChannel.id}] Data channel is now open`);
        dataChannel.send(message);
        // console.log(`[${dataChannel.id}] Message sent:`, message);
      };
    }
  }
}
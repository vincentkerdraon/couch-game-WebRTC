import { Injectable } from '@angular/core';
import { controllerConnectionID } from './network';

@Injectable({
  providedIn: 'root'
})
export class WebRTCService {
  private peerConnections: Map<string, RTCPeerConnection> = new Map();
  private dataChannels: Map<string, RTCDataChannel> = new Map();

  constructor() { }

  createPeerConnection(iceCb: (candidate: RTCIceCandidate) => void): RTCPeerConnection {
    console.log('createPeerConnection')

    const peerConnection = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] })
    peerConnection.onicecandidate = (event) => {
      if (!event.candidate) {
        //seems to be a normal case. type="icecandidate" but no candidate.
        return
      }
      //this candidates are created by the browser and must be sent to the other peer.
      console.log('ICE candidate:', event.candidate)
      iceCb(event.candidate)
    }
    peerConnection.ondatachannel = (event) => {
      console.log('peerConnection.ondatachannel:', event)
    }

    return peerConnection
  }


  private setupDataChannel(peerId: string, dataChannel: RTCDataChannel): void {
    console.log('[' + dataChannel.id + '][' + peerId + '] Data channel setup')

    dataChannel.onerror = (error) => {
      console.error('[' + dataChannel.id + '][' + peerId + '] Data channel error:', error)
    }
    dataChannel.onopen = () => {
      console.log('[' + dataChannel.id + '][' + peerId + '] Data channel is open')
    }
    dataChannel.onmessage = (event) => {
      console.log('[' + dataChannel.id + '][' + peerId + '] Received message:', event.data)
    }
    dataChannel.onclose = () => {
      console.log('[' + dataChannel.id + '][' + peerId + '] Data channel is closed')
    }
  }

  async createOffer(iceCb: (candidate: RTCIceCandidate) => void): Promise<RTCSessionDescriptionInit> {
    //Offer is always created by the controller (simplification)
    //peerConnections + dataChannels must only contain the host connection
    if (this.peerConnections.has(controllerConnectionID)) {
      throw new Error("Peer connection already exists")
    }
    const peerConnection = this.createPeerConnection(iceCb)
    this.peerConnections.set(controllerConnectionID, peerConnection)

    //create data channel before sending offer
    const dataChannel = peerConnection.createDataChannel('dataChannel')
    this.setupDataChannel(controllerConnectionID, dataChannel)
    this.dataChannels.set(controllerConnectionID, dataChannel)

    const offer = await peerConnection.createOffer()
    await peerConnection.setLocalDescription(offer)
    return offer
  }


  async createAnswer(peerId: string, offer: RTCSessionDescriptionInit, iceCb: (candidate: RTCIceCandidate) => void): Promise<RTCSessionDescriptionInit> {
    //Answer is always created by the host (simplification)
    if (this.peerConnections.has(peerId)) {
      throw new Error("Peer connection already exists for peer: " + peerId)
    }
    const peerConnection = await this.createPeerConnection(iceCb)
    this.peerConnections.set(peerId, peerConnection)
    //the data channel is auto created when the connection is established (created on the controller side)
    peerConnection.ondatachannel = (event) => {
      console.log('[' + peerId + '] ondatachannel')
      this.setupDataChannel(peerId, event.channel)
      this.dataChannels.set(peerId, event.channel)
    }

    await peerConnection.setRemoteDescription(new RTCSessionDescription(offer))
    const answer = await peerConnection.createAnswer()
    await peerConnection.setLocalDescription(answer)

    return answer
  }

  async setRemoteDescription(peerId: string, desc: RTCSessionDescriptionInit): Promise<void> {
    const pc = this.peerConnections.get(peerId)
    if (!pc) {
      throw new Error('Peer connection not found for peer: ' + peerId)
    }
    console.log('[' + peerId + '] setRemoteDescription')
    await pc.setRemoteDescription(new RTCSessionDescription(desc))
    // Apply any queued ICE candidates
    const queued = this.pendingCandidates.get(peerId) || []
    for (const c of queued) {
      console.log('[' + peerId + '] addIceCandidate (queued)')
      await pc.addIceCandidate(new RTCIceCandidate(c))
    }
    this.pendingCandidates.delete(peerId)
  }

  private pendingCandidates: Map<string, RTCIceCandidateInit[]> = new Map();

  async addIceCandidate(peerId: string, candidate: RTCIceCandidateInit): Promise<void> {
    const pc = this.peerConnections.get(peerId)
    if (!pc || !pc.currentRemoteDescription) {
      // Queue the candidate until remote description is set
      if (!this.pendingCandidates.has(peerId)) {
        this.pendingCandidates.set(peerId, [])
      }
      this.pendingCandidates.get(peerId)?.push(candidate)
      return
    }
    console.log('[' + peerId + '] addIceCandidate (direct)')
    await pc.addIceCandidate(new RTCIceCandidate(candidate))
  }


  sendMessageToHost(message: string): void {
    this.sendMessage(controllerConnectionID, message)
  }
  sendMessageToController(peerId: string, message: string): void {
    this.sendMessage(peerId, message)
  }

  private sendMessage(peerId: string, message: string): void {
    const dataChannel = this.dataChannels.get(peerId)
    if (!dataChannel) {
      throw new Error('Data channel not found for peer: ' + peerId)
    }
    console.log('[' + dataChannel.id + '][' + peerId + '] Data channel state:', dataChannel.readyState)
    if (dataChannel.readyState === 'open') {
      dataChannel.send(message)
      console.log('[' + dataChannel.id + '][' + peerId + ']  Message sent:', message)
    } else {
      console.log('[' + dataChannel.id + '][' + peerId + ']  Data channel is not open, waiting...')
      dataChannel.onopen = () => {
        console.log('[' + dataChannel.id + '][' + peerId + ']  Data channel is now open')
        dataChannel.send(message)
        console.log('[' + dataChannel.id + '][' + peerId + ']  Message sent', message)
      }
    }
  }
}
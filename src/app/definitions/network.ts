export type SyncMessageType = 'init' | 'WebRPC';

export interface SyncMessage {
    type: SyncMessageType;
    role: Role;
    sessionId: string;
    peerId: string;
    content?: SignalMessage;
}

export type Role = 'Host' | 'Controller';

export type SignalMessageType = 'offer' | 'answer' | 'candidate';

export interface SignalMessage {
    type: SignalMessageType;
    sdp?: RTCSessionDescriptionInit;
    candidate?: RTCIceCandidateInit;
}

export type ConnectionID = string
export const controllerConnectionID: ConnectionID = "c";
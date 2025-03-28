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
export const controllerConnectionID: ConnectionID = "(host)";

export interface ContentMessage {
    timestamp: number
    from: string;
    content: string;
}

export function timeNowTimestampSecond(): number {
    return Math.floor(Date.now() / 1000);
}

export function generateSessionId(): string {
    return Math.random().toString(36).substr(2, 9);
}

/// For WebRTC
export type ConnectionStatus = 'new' | 'checking' | 'connected' | 'completed' | 'disconnected' | 'failed' | 'closed';

export interface ConnectionStatuses {
    connectionStatus: ConnectionStatus
    peerId: string;
}
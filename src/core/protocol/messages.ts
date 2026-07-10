export type ProtocolVersion = 1;

export interface BaseMessage {
  protocolVersion: ProtocolVersion;
  type: string;
  senderId: string;
  workspaceId: string;
  timestamp: number;
}

// ---------------------------------------------------------
// SIGNALLING MESSAGES (Over BroadcastChannel or WebSocket)
// ---------------------------------------------------------

export interface SignalHello extends BaseMessage {
  type: 'SIGNAL_HELLO';
}

export interface SignalOffer extends BaseMessage {
  type: 'SIGNAL_OFFER';
  targetId: string;
  sdp: string;
}

export interface SignalAnswer extends BaseMessage {
  type: 'SIGNAL_ANSWER';
  targetId: string;
  sdp: string;
}

export interface SignalCandidate extends BaseMessage {
  type: 'SIGNAL_CANDIDATE';
  targetId: string;
  candidate: any; // RTCIceCandidateInit
}

export type SignallingMessage = SignalHello | SignalOffer | SignalAnswer | SignalCandidate;

// ---------------------------------------------------------
// SYNC MESSAGES (Over WebRTC DataChannel)
// ---------------------------------------------------------

// DataChannel messages are often binary, but for metadata or chat we use JSON
// Yjs updates will be sent directly as raw binary blobs over the DataChannel
// to avoid base64 serialization overhead.

export interface DataChannelHandshake {
  type: 'DC_HANDSHAKE';
  deviceId: string;
}

export interface ChatMessage {
  type: 'CHAT_MESSAGE';
  id: string;
  content: string;
  authorId: string;
  timestamp: number;
}

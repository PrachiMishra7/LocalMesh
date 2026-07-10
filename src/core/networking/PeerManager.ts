import { SignallingChannel } from './SignallingChannel';
import type { SignallingMessage } from '../protocol/messages';
import * as Y from 'yjs';
import * as awarenessProtocol from 'y-protocols/awareness';
import { generateStateVector } from '../sync/syncProtocol';
import { encryptPayload, decryptPayload } from '../security/crypto';
import { db } from '../storage/db';
import { v4 as uuidv4 } from 'uuid';

export class PeerManager {
  private deviceId: string;
  private workspaceId: string;
  private signalling: SignallingChannel;
  private peerConnections: Map<string, RTCPeerConnection> = new Map();
  private dataChannels: Map<string, RTCDataChannel> = new Map();
  private ydoc: Y.Doc;
  private cryptoKey: CryptoKey | null;
  public awareness: awarenessProtocol.Awareness;
  
  // Callbacks for UI/Yjs updates
  public onPeerConnect?: (peerId: string) => void;
  public onPeerDisconnect?: (peerId: string) => void;
  public onSyncUpdate?: (update: Uint8Array) => void;

  constructor(deviceId: string, workspaceId: string, ydoc: Y.Doc, cryptoKey: CryptoKey | null = null) {
    this.deviceId = deviceId;
    this.workspaceId = workspaceId;
    this.ydoc = ydoc;
    this.cryptoKey = cryptoKey;
    this.awareness = new awarenessProtocol.Awareness(ydoc);

    // Whenever local awareness changes (cursor moves), broadcast it!
    this.awareness.on('update', ({ added, updated, removed }: any) => {
      const changedClients = added.concat(updated, removed);
      const update = awarenessProtocol.encodeAwarenessUpdate(this.awareness, changedClients);
      this.broadcastAwarenessUpdate(update);
    });

    this.signalling = new SignallingChannel(deviceId);
    this.signalling.setOnMessage(this.handleSignallingMessage.bind(this));

    // Listen to local Yjs changes and broadcast them
    this.ydoc.on('update', (update: Uint8Array, origin: any) => {
      if (origin !== this) { // Don't broadcast updates we just received from a peer
        this.broadcastSyncUpdate(update);
      }
    });

    // Announce presence
    this.announcePresence();
  }

  private announcePresence() {
    this.signalling.broadcast({
      protocolVersion: 1,
      type: 'SIGNAL_HELLO',
      senderId: this.deviceId,
      workspaceId: this.workspaceId,
      timestamp: Date.now()
    });
  }

  private async handleSignallingMessage(msg: SignallingMessage) {
    if (msg.workspaceId !== this.workspaceId) return;

    switch (msg.type) {
      case 'SIGNAL_HELLO':
        // A new peer appeared! Initiate connection.
        if (msg.senderId > this.deviceId) {
          // Tie-breaker to prevent both sides initiating
          await this.initiateConnection(msg.senderId);
        }
        break;

      case 'SIGNAL_OFFER':
        if (msg.targetId === this.deviceId) {
          await this.handleOffer(msg.senderId, msg.sdp);
        }
        break;

      case 'SIGNAL_ANSWER':
        if (msg.targetId === this.deviceId) {
          await this.handleAnswer(msg.senderId, msg.sdp);
        }
        break;

      case 'SIGNAL_CANDIDATE':
        if (msg.targetId === this.deviceId) {
          await this.handleCandidate(msg.senderId, msg.candidate);
        }
        break;
    }
  }

  private createPeerConnection(peerId: string): RTCPeerConnection {
    // We use public STUN servers so peers can find their public IPs
    const pc = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
    });

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        this.signalling.broadcast({
          protocolVersion: 1,
          type: 'SIGNAL_CANDIDATE',
          senderId: this.deviceId,
          workspaceId: this.workspaceId,
          timestamp: Date.now(),
          targetId: peerId,
          candidate: event.candidate.toJSON()
        });
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'connected') {
        // Log join event
        db.activity.put({ id: uuidv4(), workspaceId: this.workspaceId, peerId: peerId.split('-')[0], event: 'join', timestamp: Date.now() }).catch(() => {});
        if (this.onPeerConnect) this.onPeerConnect(peerId);
      } else if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
        // Log leave event
        db.activity.put({ id: uuidv4(), workspaceId: this.workspaceId, peerId: peerId.split('-')[0], event: 'leave', timestamp: Date.now() }).catch(() => {});
        this.cleanupPeer(peerId);
        if (this.onPeerDisconnect) this.onPeerDisconnect(peerId);
      }
    };

    pc.ondatachannel = (event) => {
      this.setupDataChannel(peerId, event.channel);
    };

    this.peerConnections.set(peerId, pc);
    return pc;
  }

  private async initiateConnection(peerId: string) {
    if (this.peerConnections.has(peerId)) return;

    const pc = this.createPeerConnection(peerId);
    
    // Create the P2P Data Channel for binary CRDT exchange
    const channel = pc.createDataChannel('localmesh-sync');
    this.setupDataChannel(peerId, channel);

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    this.signalling.broadcast({
      protocolVersion: 1,
      type: 'SIGNAL_OFFER',
      senderId: this.deviceId,
      workspaceId: this.workspaceId,
      timestamp: Date.now(),
      targetId: peerId,
      sdp: offer.sdp!
    });
  }

  private async handleOffer(peerId: string, sdp: string) {
    let pc = this.peerConnections.get(peerId);
    if (!pc) {
      pc = this.createPeerConnection(peerId);
    }

    await pc.setRemoteDescription(new RTCSessionDescription({ type: 'offer', sdp }));
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);

    this.signalling.broadcast({
      protocolVersion: 1,
      type: 'SIGNAL_ANSWER',
      senderId: this.deviceId,
      workspaceId: this.workspaceId,
      timestamp: Date.now(),
      targetId: peerId,
      sdp: answer.sdp!
    });
  }

  private async handleAnswer(peerId: string, sdp: string) {
    const pc = this.peerConnections.get(peerId);
    if (pc) {
      await pc.setRemoteDescription(new RTCSessionDescription({ type: 'answer', sdp }));
    }
  }

  private async handleCandidate(peerId: string, candidate: any) {
    const pc = this.peerConnections.get(peerId);
    if (pc) {
      await pc.addIceCandidate(new RTCIceCandidate(candidate));
    }
  }

  private setupDataChannel(peerId: string, channel: RTCDataChannel) {
    channel.binaryType = 'arraybuffer';
    
    channel.onopen = () => {
      this.dataChannels.set(peerId, channel);
      // As soon as we connect, we send our State Vector to ask what we missed
      const sv = generateStateVector(this.ydoc);
      this.sendSyncUpdate(peerId, sv);
      
      // Also send our local awareness state
      if (this.awareness) {
        const awarenessUpdate = awarenessProtocol.encodeAwarenessUpdate(this.awareness, [this.ydoc.clientID]);
        this.sendAwarenessUpdate(peerId, awarenessUpdate);
      }
    };

    channel.onclose = () => {
      this.dataChannels.delete(peerId);
    };

    channel.onmessage = async (event) => {
      let data = new Uint8Array(event.data as ArrayBuffer);
      
      if (this.cryptoKey) {
        try {
          data = (await decryptPayload(this.cryptoKey, data)) as any;
        } catch (e) {
          console.error('Failed to decrypt incoming WebRTC payload:', e);
          return; // Drop message if decryption fails
        }
      }

      const messageType = data[0];
      const payload = data.subarray(1);
      
      if (messageType === 0) {
        // SYNC Message
        Y.applyUpdate(this.ydoc, payload, this); 
        if (this.onSyncUpdate) this.onSyncUpdate(payload);
      } else if (messageType === 1 && this.awareness) {
        // AWARENESS Message
        awarenessProtocol.applyAwarenessUpdate(this.awareness, payload, this);
      }
    };
  }

  public broadcastSyncUpdate(update: Uint8Array) {
    const msg = new Uint8Array(update.length + 1);
    msg[0] = 0; // 0 = SYNC
    msg.set(update, 1);
    this.broadcastToAll(msg);
  }

  public broadcastAwarenessUpdate(update: Uint8Array) {
    const msg = new Uint8Array(update.length + 1);
    msg[0] = 1; // 1 = AWARENESS
    msg.set(update, 1);
    this.broadcastToAll(msg);
  }

  private async broadcastToAll(msg: Uint8Array) {
    let payloadToSend = msg;
    if (this.cryptoKey) {
      payloadToSend = await encryptPayload(this.cryptoKey, msg);
    }
    this.dataChannels.forEach((channel) => {
      if (channel.readyState === 'open') {
        channel.send(payloadToSend as any);
      }
    });
  }

  private sendSyncUpdate(peerId: string, data: Uint8Array) {
    const msg = new Uint8Array(data.length + 1);
    msg[0] = 0;
    msg.set(data, 1);
    this.sendRawToPeer(peerId, msg);
  }

  private sendAwarenessUpdate(peerId: string, data: Uint8Array) {
    const msg = new Uint8Array(data.length + 1);
    msg[0] = 1;
    msg.set(data, 1);
    this.sendRawToPeer(peerId, msg);
  }

  private async sendRawToPeer(peerId: string, data: Uint8Array) {
    const channel = this.dataChannels.get(peerId);
    if (channel && channel.readyState === 'open') {
      let payloadToSend = data;
      if (this.cryptoKey) {
        payloadToSend = await encryptPayload(this.cryptoKey, data);
      }
      channel.send(payloadToSend as any);
    }
  }

  private cleanupPeer(peerId: string) {
    this.peerConnections.get(peerId)?.close();
    this.peerConnections.delete(peerId);
    this.dataChannels.delete(peerId);
  }

  public getConnectedPeerCount(): number {
    return this.dataChannels.size;
  }

  public destroy() {
    this.signalling.close();
    this.peerConnections.forEach(pc => pc.close());
    this.peerConnections.clear();
    this.dataChannels.clear();
  }
}

import type { SignallingMessage } from '../protocol/messages';

export type SignallingCallback = (message: SignallingMessage) => void;

/**
 * Local-First Signalling using BroadcastChannel.
 * This completely avoids the need for a Node.js/WebSocket server 
 * for the initial proof of concept when testing across two tabs on the same laptop.
 */
export class SignallingChannel {
  private channel: BroadcastChannel;
  private onMessageCallback: SignallingCallback | null = null;
  private localDeviceId: string;

  constructor(workspaceId: string, deviceId: string) {
    // Isolate signals by workspace so different documents don't collide
    this.channel = new BroadcastChannel(`localmesh-signal-${workspaceId}`);
    this.localDeviceId = deviceId;

    this.channel.onmessage = (event) => {
      const msg = event.data as SignallingMessage;
      // Don't process our own echoed messages
      if (msg.senderId !== this.localDeviceId) {
        if (this.onMessageCallback) {
          this.onMessageCallback(msg);
        }
      }
    };
  }

  public setOnMessage(callback: SignallingCallback) {
    this.onMessageCallback = callback;
  }

  public broadcast(msg: SignallingMessage) {
    this.channel.postMessage(msg);
  }

  public close() {
    this.channel.close();
  }
}

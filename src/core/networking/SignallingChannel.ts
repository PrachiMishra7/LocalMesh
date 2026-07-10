import type { SignallingMessage } from '../protocol/messages';

export type SignallingCallback = (message: SignallingMessage) => void;

/**
 * WebRTC Signalling using a WebSocket server.
 * Connects to ws://localhost:8080 to route handshakes between peers on different computers.
 */
export class SignallingChannel {
  private ws: WebSocket;
  private onMessageCallback: SignallingCallback | null = null;
  private localDeviceId: string;
  private messageQueue: SignallingMessage[] = []; // Queue messages if socket isn't open yet

  constructor(deviceId: string) {
    this.localDeviceId = deviceId;
    
    // Connect to the local Node.js signalling server
    // (In production, this would be wss://your-domain.com/signal)
    this.ws = new WebSocket('ws://localhost:8080');

    this.ws.onopen = () => {
      console.log('Connected to Signalling Server.');
      // Flush any queued messages
      while (this.messageQueue.length > 0) {
        const msg = this.messageQueue.shift();
        if (msg) this.ws.send(JSON.stringify(msg));
      }
    };

    this.ws.onmessage = (event) => {
      try {
        // The server broadcasts as string, we can parse it as string or Buffer
        const textData = typeof event.data === 'string' ? event.data : event.data.toString();
        const msg = JSON.parse(textData) as SignallingMessage;
        
        // We still check senderId just in case, though the server prevents echoing
        if (msg.senderId !== this.localDeviceId) {
          if (this.onMessageCallback) {
            this.onMessageCallback(msg);
          }
        }
      } catch (e) {
        console.error('Error parsing signalling message from server:', e);
      }
    };

    this.ws.onclose = () => {
      console.warn('Disconnected from Signalling Server.');
    };
  }

  public setOnMessage(callback: SignallingCallback) {
    this.onMessageCallback = callback;
  }

  public broadcast(msg: SignallingMessage) {
    if (this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg));
    } else {
      this.messageQueue.push(msg);
    }
  }

  public close() {
    this.ws.close();
  }
}

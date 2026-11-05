import { WebSocket, WebSocketServer } from 'ws';
import http from 'http';

export interface WebSocketMessage {
  type: 'ORDER_NEW' | 'KDS_ITEM_STATUS' | 'KDS_ORDER_COMPLETED' | 'STOCK_ALERT' | 'TABLE_UPDATED' | 'SHIFT_CHANGED';
  payload: any;
  timestamp: string;
}

class KDSHub {
  private wss: WebSocketServer | null = null;

  public init(server: http.Server) {
    this.wss = new WebSocketServer({ server, path: '/ws' });

    this.wss.on('connection', (ws: WebSocket, req) => {
      console.log(`[WebSocket] New client connected from ${req.socket.remoteAddress}`);

      ws.send(JSON.stringify({
        type: 'CONNECTION_ACK',
        payload: { message: 'Kết nối Real-time KDS & POS thành công!' },
        timestamp: new Date().toISOString()
      }));

      ws.on('message', (message: string) => {
        try {
          const data = JSON.parse(message.toString());
          console.log('[WebSocket received]:', data.type);
        } catch (e) {
          console.error('[WebSocket] Failed to parse client message');
        }
      });

      ws.on('close', () => {
        console.log('[WebSocket] Client disconnected');
      });
    });

    console.log('[KDSHub] WebSocket Server ready at path /ws');
  }

  public broadcast(type: WebSocketMessage['type'], payload: any) {
    if (!this.wss) return;

    const message: WebSocketMessage = {
      type,
      payload,
      timestamp: new Date().toISOString()
    };

    const serialized = JSON.stringify(message);

    this.wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(serialized);
      }
    });
  }
}

export const kdsHub = new KDSHub();

import { getWsUrl } from './api';

type RealtimeCallback = (payload: {
  event: 'INSERT' | 'UPDATE' | 'DELETE';
  table: string;
  record?: Record<string, unknown>;
  records?: Record<string, unknown>[];
}) => void;

export class RealtimeClient {
  private ws: WebSocket | null = null;
  private projectId: string;
  private subscriptions: Map<string, Set<RealtimeCallback>> = new Map();
  private reconnectTimer: number | null = null;

  constructor(projectId: string) {
    this.projectId = projectId;
  }

  connect(): void {
    if (this.ws?.readyState === WebSocket.OPEN) return;

    const wsUrl = `${getWsUrl()}?projectId=${this.projectId}`;
    this.ws = new WebSocket(wsUrl);

    this.ws.onopen = () => {
      console.log('Realtime connected');
      this.subscriptions.forEach((_, table) => {
        this.ws?.send(JSON.stringify({ type: 'subscribe', table }));
      });
    };

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'postgres_changes') {
          const callbacks = this.subscriptions.get(data.table);
          callbacks?.forEach(cb => cb({
            event: data.event,
            table: data.table,
            record: data.record,
            records: data.records
          }));
        }
      } catch (err) {
        console.error('Realtime parse error:', err);
      }
    };

    this.ws.onclose = () => {
      console.log('Realtime disconnected');
      this.scheduleReconnect();
    };

    this.ws.onerror = (err) => {
      console.error('Realtime error:', err);
    };
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) return;
    this.reconnectTimer = window.setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, 3000);
  }

  subscribe(table: string, callback: RealtimeCallback): () => void {
    if (!this.subscriptions.has(table)) {
      this.subscriptions.set(table, new Set());
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: 'subscribe', table }));
      }
    }
    this.subscriptions.get(table)!.add(callback);

    return () => {
      const subs = this.subscriptions.get(table);
      subs?.delete(callback);
      if (subs?.size === 0) {
        this.subscriptions.delete(table);
        if (this.ws?.readyState === WebSocket.OPEN) {
          this.ws.send(JSON.stringify({ type: 'unsubscribe', table }));
        }
      }
    };
  }

  disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.ws?.close();
    this.ws = null;
  }
}

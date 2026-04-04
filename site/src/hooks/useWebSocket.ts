import { useEffect, useRef, useState, useCallback } from "react";

export interface AgentEvent {
  type: string;
  timestamp: string;
  payload: Record<string, unknown>;
}

interface UseWebSocketReturn {
  events: AgentEvent[];
  connected: boolean;
  connectionCount: number;
}

const MAX_EVENTS = 100;
const RECONNECT_BASE_MS = 1000;
const RECONNECT_MAX_MS = 30000;
const API_BASE = import.meta.env.VITE_API_URL || "";

export function useWebSocket(url: string): UseWebSocketReturn {
  const [events, setEvents] = useState<AgentEvent[]>([]);
  const [connected, setConnected] = useState(false);
  const [connectionCount, setConnectionCount] = useState(0);
  const wsRef = useRef<WebSocket | null>(null);
  const retryRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const historyLoaded = useRef(false);

  useEffect(() => {
    if (historyLoaded.current) return;
    historyLoaded.current = true;

    fetch(`${API_BASE}/api/events?limit=30`)
      .then(r => r.ok ? r.json() : null)
      .then((data: { events: AgentEvent[] } | null) => {
        if (data?.events?.length) {
          setEvents(prev => {
            const wsTimestamps = new Set(prev.map(e => `${e.type}-${e.timestamp}`));
            const fresh = data.events.filter(e =>
              e.type !== "CONNECTED" && !wsTimestamps.has(`${e.type}-${e.timestamp}`)
            );
            return [...prev, ...fresh].slice(0, MAX_EVENTS);
          });
        }
      })
      .catch(() => {});
  }, []);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      setConnected(true);
      retryRef.current = 0;
    };

    ws.onmessage = (e) => {
      try {
        const event: AgentEvent = JSON.parse(e.data);
        if (event.payload?.connections !== undefined) {
          setConnectionCount(event.payload.connections as number);
        }
        if (event.type === "CONNECTED") return;
        setEvents(prev => [event, ...prev].slice(0, MAX_EVENTS));
      } catch {
        // ignore malformed messages
      }
    };

    ws.onclose = () => {
      setConnected(false);
      wsRef.current = null;
      const delay = Math.min(
        RECONNECT_BASE_MS * Math.pow(2, retryRef.current),
        RECONNECT_MAX_MS,
      );
      retryRef.current++;
      timerRef.current = setTimeout(connect, delay);
    };

    ws.onerror = () => {
      ws.close();
    };
  }, [url]);

  useEffect(() => {
    connect();
    return () => {
      timerRef.current && clearTimeout(timerRef.current);
      wsRef.current?.close();
    };
  }, [connect]);

  return { events, connected, connectionCount };
}

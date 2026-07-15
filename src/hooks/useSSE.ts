"use client";
import { useState, useEffect, useCallback, useRef } from "react";

interface SSEEvent {
  event: string;
  data: unknown;
}

export function useSSE(url: string = "/api/events") {
  const [connected, setConnected] = useState(false);
  const [events, setEvents] = useState<SSEEvent[]>([]);
  const eventSourceRef = useRef<EventSource | null>(null);
  const listenersRef = useRef<Map<string, Set<(data: unknown) => void>>>(new Map());

  useEffect(() => {
    const es = new EventSource(url);
    eventSourceRef.current = es;

    es.onopen = () => setConnected(true);
    es.onerror = () => setConnected(false);

    es.addEventListener("connected", () => setConnected(true));

    // Generic message handler
    es.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        setEvents(prev => [...prev.slice(-50), { event: "message", data }]);
      } catch { /* ignore */ }
    };

    return () => {
      es.close();
      eventSourceRef.current = null;
    };
  }, [url]);

  const subscribe = useCallback((eventName: string, handler: (data: unknown) => void) => {
    if (!listenersRef.current.has(eventName)) {
      listenersRef.current.set(eventName, new Set());
    }
    listenersRef.current.get(eventName)!.add(handler);

    // Also listen on the EventSource
    const es = eventSourceRef.current;
    if (es) {
      es.addEventListener(eventName, (e: MessageEvent) => {
        try {
          const data = JSON.parse(e.data);
          handler(data);
          setEvents(prev => [...prev.slice(-50), { event: eventName, data }]);
        } catch { /* ignore */ }
      });
    }

    return () => {
      listenersRef.current.get(eventName)?.delete(handler);
    };
  }, []);

  return { connected, events, subscribe };
}

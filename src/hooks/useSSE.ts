"use client";
import { useState, useEffect, useCallback, useRef } from "react";

interface SSEEvent {
  event: string;
  data: unknown;
}

export function useSSE(url: string = "/api/events", token?: string) {
  const [connected, setConnected] = useState(false);
  const [events, setEvents] = useState<SSEEvent[]>([]);
  const eventSourceRef = useRef<EventSource | null>(null);
  const listenersRef = useRef<Map<string, Set<(data: unknown) => void>>>(new Map());
  const cleanupRef = useRef<Map<string, () => void>>(new Map());

  useEffect(() => {
    const wsUrl = token ? `${url}${url.includes("?") ? "&" : "?"}token=${encodeURIComponent(token)}` : url;
    const es = new EventSource(wsUrl);
    const cleanupMap = cleanupRef.current;
    eventSourceRef.current = es;

    es.onopen = () => setConnected(true);
    es.onerror = () => setConnected(false);

    es.addEventListener("connected", () => setConnected(true));

    es.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        setEvents(prev => [...prev.slice(-50), { event: "message", data }]);
      } catch { /* ignore */ }
    };

    return () => {
      es.close();
      eventSourceRef.current = null;
      cleanupMap.forEach(fn => fn());
      cleanupMap.clear();
    };
  }, [url, token]);

  const subscribe = useCallback((eventName: string, handler: (data: unknown) => void) => {
    if (!listenersRef.current.has(eventName)) {
      listenersRef.current.set(eventName, new Set());
    }
    listenersRef.current.get(eventName)!.add(handler);

    const es = eventSourceRef.current;
    if (es) {
      const listener = (e: MessageEvent) => {
        try {
          const data = JSON.parse(e.data);
          handler(data);
          setEvents(prev => [...prev.slice(-50), { event: eventName, data }]);
        } catch { /* ignore */ }
      };
      es.addEventListener(eventName, listener);

      const unsubscribe = () => {
        listenersRef.current.get(eventName)?.delete(handler);
        es.removeEventListener(eventName, listener);
      };
      cleanupRef.current.set(eventName + String(Math.random()), unsubscribe);
      return unsubscribe;
    }

    return () => {
      listenersRef.current.get(eventName)?.delete(handler);
    };
  }, []);

  return { connected, events, subscribe };
}

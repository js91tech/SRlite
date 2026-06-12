import { useEffect, useRef } from "react";

export function useWebSocket(onMessage: (data: { type: string; payload: unknown }) => void) {
  const handler = useRef(onMessage);
  handler.current = onMessage;

  useEffect(() => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const ws = new WebSocket(`${protocol}//${window.location.host}/ws`);

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        handler.current(data);
      } catch {
        // ignore malformed
      }
    };

    return () => ws.close();
  }, []);
}

import { WebSocketServer, WebSocket } from "ws";
import type { Server } from "http";
import type { Lead } from "./types.js";

let wss: WebSocketServer | null = null;

export function initWebSocket(server: Server): WebSocketServer {
  wss = new WebSocketServer({ server, path: "/ws" });

  wss.on("connection", (ws) => {
    ws.send(JSON.stringify({ type: "connected", at: new Date().toISOString() }));
  });

  return wss;
}

export function broadcast(event: { type: string; payload: unknown }) {
  if (!wss) return;
  const msg = JSON.stringify(event);
  for (const client of wss.clients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(msg);
    }
  }
}

export function broadcastLeadAlert(lead: Lead, isNew: boolean) {
  broadcast({
    type: isNew ? "lead:new" : "lead:updated",
    payload: lead,
  });
}

export function broadcastLeadsRefresh() {
  broadcast({ type: "leads:refresh", payload: null });
}

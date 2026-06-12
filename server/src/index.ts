import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "../../.env") });
import cors from "cors";
import express from "express";
import http from "http";
import router from "./routes/index.js";
import { initWebSocket, broadcastLeadAlert } from "./websocket.js";
import {
  expireStaleLeads,
  rescoreAllLeads,
  upsertLead,
  getTerritory,
  DEFAULT_TERRITORY_ID,
} from "./db/index.js";
import { fetch511Events, normalize511Event } from "./services/poller511.js";

const PORT = parseInt(process.env.PORT ?? "3001", 10);
const GA511_API_KEY = process.env.GA511_API_KEY ?? "";

const app = express();
app.use(cors());
app.use(express.json());
app.use("/api", router);
app.use(express.static(path.join(__dirname, "../public")));
app.get("/help", (_req, res) => {
  res.sendFile(path.join(__dirname, "../public/help.html"));
});

const clientDist = path.join(__dirname, "../../client/dist");
app.use(express.static(clientDist));
app.get("*", (req, res, next) => {
  if (req.path.startsWith("/api") || req.path.startsWith("/ws")) return next();
  res.sendFile(path.join(clientDist, "index.html"), (err) => {
    if (err) next();
  });
});

const server = http.createServer(app);
initWebSocket(server);

async function poll511() {
  if (!GA511_API_KEY) return;

  try {
    const events = await fetch511Events(GA511_API_KEY);
    const territory = getTerritory(DEFAULT_TERRITORY_ID);

    for (const event of events) {
      const input = normalize511Event(event, DEFAULT_TERRITORY_ID);
      if (!input) continue;

      const { lead, isNew } = upsertLead(input, DEFAULT_TERRITORY_ID);
      if (
        isNew &&
        lead.score >= territory.alert_sound_threshold
      ) {
        broadcastLeadAlert(lead, true);
      } else if (!isNew) {
        broadcastLeadAlert(lead, false);
      }
    }

    expireStaleLeads();
    rescoreAllLeads();
  } catch (err) {
    console.error("[511 poller]", err);
  }
}

setInterval(() => {
  expireStaleLeads();
  rescoreAllLeads();
}, 30_000);

if (GA511_API_KEY) {
  console.log("511GA poller enabled (every 60s)");
  poll511();
  setInterval(poll511, 60_000);
} else {
  console.log("511GA poller disabled — set GA511_API_KEY in .env to enable live incidents");
}

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Roadside Radar listening on port ${PORT}`);
  console.log(`Dashboard + API on PORT; WebSocket at /ws`);
});

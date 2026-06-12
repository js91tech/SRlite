import { Router } from "express";
import {
  assignLeadToTruck,
  expireStaleLeads,
  getLead,
  getQuoteTemplates,
  getTerritory,
  isLiveMode,
  listLeads,
  listTerritories,
  listTrucks,
  rescoreAllLeads,
  updateLeadStatus,
  updateTerritory,
  updateTruckLocation,
  upsertLead,
  DEFAULT_TERRITORY_ID,
} from "../db/index.js";
import type { CreateLeadInput, LeadStatus } from "../types.js";
import { broadcastLeadAlert, broadcastLeadsRefresh } from "../websocket.js";

const router = Router();

router.get("/health", (_req, res) => {
  const ga511Key = process.env.GA511_API_KEY ?? "";
  res.json({
    ok: true,
    at: new Date().toISOString(),
    live_mode: isLiveMode(),
    poller_511: {
      enabled: Boolean(ga511Key),
      interval_seconds: 60,
    },
    lead_sources: {
      gdot_511: Boolean(ga511Key) ? "live" : "disabled",
      self_report: "live",
      honk: "demo_only",
      social: "demo_only",
    },
  });
});

router.get("/territories", (_req, res) => {
  res.json(listTerritories());
});

router.get("/territories/:id", (req, res) => {
  try {
    res.json(getTerritory(req.params.id));
  } catch {
    res.status(404).json({ error: "Territory not found" });
  }
});

router.patch("/territories/:id", async (req, res) => {
  try {
    const body = req.body as Partial<{
      name: string;
      center_lat: number;
      center_lng: number;
      center_zip: string;
      radius_miles: number;
    }>;

    if (body.center_zip && body.center_lat === undefined) {
      const { geocodeZip } = await import("../services/geocode.js");
      const coords = await geocodeZip(body.center_zip);
      body.center_lat = coords.lat;
      body.center_lng = coords.lng;
    }

    const updated = updateTerritory(req.params.id, body);
    rescoreAllLeads();
    broadcastLeadsRefresh();
    res.json(updated);
  } catch (e) {
    res.status(400).json({ error: (e as Error).message });
  }
});

router.get("/trucks", (_req, res) => {
  res.json(listTrucks());
});

router.patch("/trucks/:id/location", (req, res) => {
  const { lat, lng, status } = req.body;
  if (typeof lat !== "number" || typeof lng !== "number") {
    return res.status(400).json({ error: "lat and lng required" });
  }
  try {
    const truck = updateTruckLocation(req.params.id, lat, lng, status);
    rescoreAllLeads();
    broadcastLeadsRefresh();
    res.json(truck);
  } catch {
    res.status(404).json({ error: "Truck not found" });
  }
});

router.get("/leads", (req, res) => {
  const territoryId = (req.query.territory_id as string) || DEFAULT_TERRITORY_ID;
  const mode = req.query.mode as "fish" | "jobs" | undefined;
  const minScore = req.query.min_score
    ? parseInt(req.query.min_score as string, 10)
    : undefined;

  expireStaleLeads();
  rescoreAllLeads();
  const leads = listLeads(territoryId, { mode, minScore });
  res.json(leads);
});

router.get("/leads/:id", (req, res) => {
  const lead = getLead(req.params.id);
  if (!lead) return res.status(404).json({ error: "Lead not found" });
  res.json(lead);
});

router.post("/leads", (req, res) => {
  const input = req.body as CreateLeadInput;
  if (!input.issue_description || typeof input.lat !== "number" || typeof input.lng !== "number") {
    return res.status(400).json({ error: "issue_description, lat, lng required" });
  }
  try {
    const { lead, isNew } = upsertLead(input);
    broadcastLeadAlert(lead, isNew);
    res.status(isNew ? 201 : 200).json(lead);
  } catch (e) {
    res.status(400).json({ error: (e as Error).message });
  }
});

router.patch("/leads/:id/status", (req, res) => {
  const { status } = req.body as { status: LeadStatus };
  try {
    const lead = updateLeadStatus(req.params.id, status);
    broadcastLeadsRefresh();
    res.json(lead);
  } catch {
    res.status(404).json({ error: "Lead not found" });
  }
});

router.post("/leads/:id/assign", (req, res) => {
  const { truck_id, quote_amount } = req.body as {
    truck_id: string;
    quote_amount?: number;
  };
  if (!truck_id) return res.status(400).json({ error: "truck_id required" });
  try {
    const result = assignLeadToTruck(req.params.id, truck_id, quote_amount ?? 125);
    broadcastLeadsRefresh();
    res.json(result);
  } catch (e) {
    res.status(400).json({ error: (e as Error).message });
  }
});

router.get("/quotes", (req, res) => {
  const territoryId = (req.query.territory_id as string) || DEFAULT_TERRITORY_ID;
  res.json(getQuoteTemplates(territoryId));
});

export default router;

import type { CreateLeadInput } from "../types.js";
import { classifyIssue, estimateConfidence } from "./classify.js";
import { inTerritory } from "./geofence.js";
import { getTerritory } from "../db/index.js";
import { DEFAULT_TERRITORY_ID } from "../db/index.js";

interface Event511 {
  ID?: string | number;
  Id?: string | number;
  id?: string | number;
  EventType?: string;
  eventType?: string;
  Latitude?: string | number;
  latitude?: string | number;
  Longitude?: string | number;
  longitude?: string | number;
  Description?: string;
  description?: string;
  RoadwayName?: string;
  roadwayName?: string;
  DirectionOfTravel?: string;
  Reported?: string | number;
  reported?: string | number;
}

function pick<T>(obj: Event511, ...keys: (keyof Event511)[]): T | undefined {
  for (const k of keys) {
    const v = obj[k];
    if (v !== undefined && v !== null) return v as T;
  }
  return undefined;
}

export function normalize511Event(
  event: Event511,
  territoryId = DEFAULT_TERRITORY_ID
): CreateLeadInput | null {
  const eventType = (pick<string>(event, "EventType", "eventType") ?? "").toLowerCase();
  if (eventType !== "accidentsandincidents") return null;

  const lat = parseFloat(String(pick(event, "Latitude", "latitude") ?? ""));
  const lng = parseFloat(String(pick(event, "Longitude", "longitude") ?? ""));
  if (Number.isNaN(lat) || Number.isNaN(lng)) return null;

  const territory = getTerritory(territoryId);
  if (
    !inTerritory(
      lat,
      lng,
      territory.center_lat,
      territory.center_lng,
      territory.radius_miles
    )
  ) {
    return null;
  }

  const desc = (pick<string>(event, "Description", "description") ?? "").trim();
  const reportedUnix = pick<string | number>(event, "Reported", "reported");
  const reportedAt = reportedUnix
    ? new Date(Number(reportedUnix) * 1000).toISOString()
    : new Date().toISOString();

  const externalId = String(pick(event, "ID", "Id", "id") ?? "");

  return {
    source_type: "gdot_511",
    source_provider: "511GA",
    source_external_id: externalId,
    source_external_url: "https://511ga.org/",
    issue_category: classifyIssue(desc),
    issue_description: desc || "Traffic incident reported on 511GA",
    issue_confidence: estimateConfidence(desc),
    lat,
    lng,
    roadway: pick<string>(event, "RoadwayName", "roadwayName") ?? undefined,
    direction: pick<string>(event, "DirectionOfTravel") ?? undefined,
    contactable: false,
    reported_at: reportedAt,
  };
}

export async function fetch511Events(apiKey: string): Promise<Event511[]> {
  const url = new URL("https://511ga.org/api/v2/get/event");
  url.searchParams.set("key", apiKey);
  url.searchParams.set("format", "json");

  const resp = await fetch(url.toString(), { signal: AbortSignal.timeout(20000) });
  if (!resp.ok) {
    throw new Error(`511GA API error: ${resp.status} ${resp.statusText}`);
  }

  const data = (await resp.json()) as unknown;
  if (Array.isArray(data)) return data as Event511[];
  if (data && typeof data === "object") {
    const obj = data as Record<string, unknown>;
    if (Array.isArray(obj.events)) return obj.events as Event511[];
    if (Array.isArray(obj.Event)) return obj.Event as Event511[];
  }
  return [];
}

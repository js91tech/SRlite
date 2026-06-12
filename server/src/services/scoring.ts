import type { Lead, Territory, Truck } from "../types.js";
import { haversineMiles, estimateEtaMinutes } from "./geofence.js";

export interface NearestTruck {
  truck_id: string;
  distance_miles: number;
  eta_minutes: number;
}

export function findNearestTruck(
  lat: number,
  lng: number,
  trucks: Truck[]
): NearestTruck | null {
  const available = trucks.filter((t) => t.status === "available");
  if (available.length === 0) return null;

  let best: NearestTruck | null = null;
  for (const truck of available) {
    const distance = haversineMiles(lat, lng, truck.lat, truck.lng);
    const eta = estimateEtaMinutes(distance);
    if (!best || distance < best.distance_miles) {
      best = {
        truck_id: truck.id,
        distance_miles: Math.round(distance * 10) / 10,
        eta_minutes: eta,
      };
    }
  }
  return best;
}

function corridorBonus(
  roadway: string | null,
  territory: Territory
): { bonus: number; corridorId: string | null } {
  if (!roadway) return { bonus: 0, corridorId: null };
  const normalized = roadway.toUpperCase().replace(/[\s-]/g, "");

  for (const corridor of territory.hot_corridors) {
    for (const name of corridor.roadway_names) {
      const corridorNorm = name.toUpperCase().replace(/[\s-]/g, "");
      if (normalized.includes(corridorNorm) || corridorNorm.includes(normalized)) {
        return { bonus: corridor.boost_points, corridorId: corridor.id };
      }
    }
  }
  return { bonus: 0, corridorId: null };
}

function freshnessBonus(reportedAt: string): number {
  const ageSec = (Date.now() - new Date(reportedAt).getTime()) / 1000;
  if (ageSec < 300) return 20;
  if (ageSec < 900) return 10;
  if (ageSec < 1800) return 0;
  return -15;
}

export function scoreLead(
  lead: Partial<Lead> & {
    source_type: Lead["source_type"];
    lat: number;
    lng: number;
    reported_at: string;
    contactable: boolean;
    roadway: string | null;
  },
  territory: Territory,
  trucks: Truck[]
): {
  score: number;
  breakdown: Record<string, number>;
  nearest_truck_id: string | null;
  nearest_truck_eta_minutes: number | null;
  nearest_corridor_id: string | null;
  distance_from_center_miles: number;
} {
  const sourceWeight =
    territory.source_weights[lead.source_type] ??
    territory.source_weights.default ??
    50;

  const breakdown: Record<string, number> = {
    source_weight: sourceWeight,
    freshness_bonus: freshnessBonus(lead.reported_at),
    contactable_bonus: lead.contactable ? 15 : 0,
  };

  const { bonus, corridorId } = corridorBonus(lead.roadway, territory);
  breakdown.corridor_bonus = bonus;

  const distanceFromCenter = haversineMiles(
    territory.center_lat,
    territory.center_lng,
    lead.lat,
    lead.lng
  );

  const nearest = findNearestTruck(lead.lat, lead.lng, trucks);
  if (nearest) {
    if (nearest.eta_minutes <= 15) breakdown.truck_proximity_bonus = 15;
    else if (nearest.eta_minutes <= 25) breakdown.truck_proximity_bonus = 8;
    else breakdown.truck_proximity_bonus = 0;
  } else {
    breakdown.truck_proximity_bonus = 0;
  }

  const score = Object.values(breakdown).reduce((a, b) => a + b, 0);

  return {
    score,
    breakdown,
    nearest_truck_id: nearest?.truck_id ?? null,
    nearest_truck_eta_minutes: nearest?.eta_minutes ?? null,
    nearest_corridor_id: corridorId,
    distance_from_center_miles: Math.round(distanceFromCenter * 10) / 10,
  };
}

import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";
import { v4 as uuid } from "uuid";
import { MIGRATION_SQL } from "./schema.js";
import type {
  CreateLeadInput,
  Job,
  Lead,
  LeadStatus,
  Territory,
  Truck,
} from "../types.js";
import { inTerritory } from "../services/geofence.js";
import { classifyIssue, estimateConfidence } from "../services/classify.js";
import { scoreLead } from "../services/scoring.js";
import fs from "fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, "../../data/roadside-radar.db");

fs.mkdirSync(path.dirname(dbPath), { recursive: true });

const db = new Database(dbPath);
db.exec(MIGRATION_SQL);

const DEFAULT_TERRITORY_ID = "territory_marietta_25";

const MARIETTA_TERRITORY: Territory = {
  id: DEFAULT_TERRITORY_ID,
  name: "Marietta Primary",
  active: true,
  center_lat: 33.9526,
  center_lng: -84.5499,
  center_zip: "30060",
  radius_miles: 25,
  hot_corridors: [
    {
      id: "i75_core",
      name: "I-75 Marietta Corridor",
      roadway_names: ["I-75", "I75", "I 75"],
      boost_points: 20,
    },
    {
      id: "i285_nw",
      name: "I-285 NW Top End",
      roadway_names: ["I-285", "I285", "I 285"],
      boost_points: 20,
    },
    {
      id: "i575",
      name: "I-575",
      roadway_names: ["I-575", "I575"],
      boost_points: 15,
    },
  ],
  source_weights: {
    honk: 95,
    urgently: 95,
    motor_club_email: 88,
    self_report: 90,
    inbound_call: 93,
    partner_referral: 85,
    social: 75,
    police_rotation: 92,
    gdot_511: 50,
    demo: 60,
    default: 50,
  },
  alert_sound_threshold: 80,
  alert_visible_threshold: 50,
  auto_expire_minutes: 20,
};

function rowToTerritory(row: Record<string, unknown>): Territory {
  return {
    id: row.id as string,
    name: row.name as string,
    active: Boolean(row.active),
    center_lat: row.center_lat as number,
    center_lng: row.center_lng as number,
    center_zip: row.center_zip as string,
    radius_miles: row.radius_miles as number,
    hot_corridors: JSON.parse((row.hot_corridors as string) || "[]"),
    source_weights: JSON.parse((row.source_weights as string) || "{}"),
    alert_sound_threshold: row.alert_sound_threshold as number,
    alert_visible_threshold: row.alert_visible_threshold as number,
    auto_expire_minutes: row.auto_expire_minutes as number,
  };
}

function rowToTruck(row: Record<string, unknown>): Truck {
  return {
    id: row.id as string,
    label: row.label as string,
    type: row.type as string,
    capabilities: JSON.parse((row.capabilities as string) || "[]"),
    status: row.status as Truck["status"],
    lat: row.lat as number,
    lng: row.lng as number,
    driver_name: (row.driver_name as string) ?? null,
    updated_at: row.updated_at as string,
  };
}

function rowToLead(row: Record<string, unknown>): Lead {
  return {
    id: row.id as string,
    cluster_id: (row.cluster_id as string) ?? null,
    territory_id: row.territory_id as string,
    status: row.status as LeadStatus,
    source_type: row.source_type as Lead["source_type"],
    source_provider: row.source_provider as string,
    source_external_id: (row.source_external_id as string) ?? null,
    source_external_url: (row.source_external_url as string) ?? null,
    issue_category: row.issue_category as Lead["issue_category"],
    issue_description: row.issue_description as string,
    issue_confidence: row.issue_confidence as number,
    lat: row.lat as number,
    lng: row.lng as number,
    roadway: (row.roadway as string) ?? null,
    direction: (row.direction as string) ?? null,
    distance_from_center_miles: row.distance_from_center_miles as number,
    nearest_corridor_id: (row.nearest_corridor_id as string) ?? null,
    contactable: Boolean(row.contactable),
    contact_name: (row.contact_name as string) ?? null,
    contact_phone: (row.contact_phone as string) ?? null,
    contact_method: (row.contact_method as string) ?? null,
    social_platform: (row.social_platform as string) ?? null,
    social_url: (row.social_url as string) ?? null,
    score: row.score as number,
    score_breakdown: JSON.parse((row.score_breakdown as string) || "{}"),
    nearest_truck_id: (row.nearest_truck_id as string) ?? null,
    nearest_truck_eta_minutes: (row.nearest_truck_eta_minutes as number) ?? null,
    assigned_truck_id: (row.assigned_truck_id as string) ?? null,
    marketplace_offer_id: (row.marketplace_offer_id as string) ?? null,
    marketplace_payout: (row.marketplace_payout as number) ?? null,
    marketplace_expires_at: (row.marketplace_expires_at as string) ?? null,
    tags: JSON.parse((row.tags as string) || "[]"),
    reported_at: row.reported_at as string,
    expires_at: row.expires_at as string,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  };
}

function seedIfEmpty() {
  const count = db
    .prepare("SELECT COUNT(*) as c FROM territories")
    .get() as { c: number };
  if (count.c > 0) return;

  const t = MARIETTA_TERRITORY;
  db.prepare(
    `INSERT INTO territories (id, name, active, center_lat, center_lng, center_zip, radius_miles,
      hot_corridors, source_weights, alert_sound_threshold, alert_visible_threshold, auto_expire_minutes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    t.id,
    t.name,
    t.active ? 1 : 0,
    t.center_lat,
    t.center_lng,
    t.center_zip,
    t.radius_miles,
    JSON.stringify(t.hot_corridors),
    JSON.stringify(t.source_weights),
    t.alert_sound_threshold,
    t.alert_visible_threshold,
    t.auto_expire_minutes
  );

  const now = new Date().toISOString();
  const trucks: Omit<Truck, "updated_at">[] = [
    {
      id: "truck_01",
      label: "Unit 1 - Flatbed",
      type: "flatbed",
      capabilities: ["tow", "recovery"],
      status: "available",
      lat: 33.9312,
      lng: -84.4981,
      driver_name: "Mike",
    },
    {
      id: "truck_02",
      label: "Unit 2 - Wrecker",
      type: "wrecker",
      capabilities: ["tow", "jump_start"],
      status: "available",
      lat: 33.978,
      lng: -84.58,
      driver_name: "James",
    },
    {
      id: "truck_03",
      label: "Unit 3 - Flatbed",
      type: "flatbed",
      capabilities: ["tow", "recovery", "jump_start"],
      status: "available",
      lat: 33.905,
      lng: -84.515,
      driver_name: "Carlos",
    },
  ];

  const insertTruck = db.prepare(
    `INSERT INTO trucks (id, label, type, capabilities, status, lat, lng, driver_name, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );
  for (const truck of trucks) {
    insertTruck.run(
      truck.id,
      truck.label,
      truck.type,
      JSON.stringify(truck.capabilities),
      truck.status,
      truck.lat,
      truck.lng,
      truck.driver_name,
      now
    );
  }

  db.prepare(
    `INSERT INTO quote_templates (id, territory_id, name, service_type, base_price, sms_template)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(
    "quote_i75",
    t.id,
    "I-75 Flatbed Hook",
    "tow",
    125,
    "This is Roadside Radar Dispatch. We can reach you in ~{{eta}} min. Flatbed tow: ${{price}}. Reply YES to dispatch."
  );

  seedDemoLeads();
}

function seedDemoLeads() {
  const demos: CreateLeadInput[] = [
    {
      source_type: "honk",
      source_provider: "honk",
      source_external_id: "HNK-DEMO-001",
      issue_category: "tow",
      issue_description: "No start - flatbed requested near I-75 exit 267",
      lat: 34.018,
      lng: -84.515,
      roadway: "I-75",
      direction: "northbound",
      contactable: true,
      contact_phone: "+16785550100",
      contact_method: "platform",
      marketplace_offer_id: "HNK-DEMO-001",
      marketplace_payout: 95,
      marketplace_expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
    },
    {
      source_type: "social",
      source_provider: "reddit",
      source_external_id: "reddit-demo-001",
      source_external_url: "https://reddit.com/r/Atlanta/",
      issue_description: "Stranded on 75 north near exit 267, need a tow",
      lat: 34.012,
      lng: -84.52,
      roadway: "I-75",
      direction: "northbound",
      contactable: true,
      contact_method: "social_reply",
      social_platform: "reddit",
      social_url: "https://reddit.com/r/Atlanta/",
    },
    {
      source_type: "gdot_511",
      source_provider: "511GA",
      source_external_id: "511-DEMO-001",
      issue_description: "Accident - disabled vehicle on shoulder, 2 lanes blocked",
      lat: 33.987,
      lng: -84.541,
      roadway: "I-75",
      direction: "northbound",
      contactable: false,
    },
  ];

  for (const demo of demos) {
    upsertLead(demo, DEFAULT_TERRITORY_ID);
  }
}

seedIfEmpty();

export function getTerritory(id = DEFAULT_TERRITORY_ID): Territory {
  const row = db.prepare("SELECT * FROM territories WHERE id = ?").get(id);
  if (!row) throw new Error(`Territory not found: ${id}`);
  return rowToTerritory(row as Record<string, unknown>);
}

export function listTerritories(): Territory[] {
  return (db.prepare("SELECT * FROM territories").all() as Record<string, unknown>[]).map(
    rowToTerritory
  );
}

export function updateTerritory(
  id: string,
  updates: Partial<{
    name: string;
    center_lat: number;
    center_lng: number;
    center_zip: string;
    radius_miles: number;
  }>
): Territory {
  const current = getTerritory(id);
  const next = { ...current, ...updates };
  db.prepare(
    `UPDATE territories SET name=?, center_lat=?, center_lng=?, center_zip=?, radius_miles=?
     WHERE id=?`
  ).run(next.name, next.center_lat, next.center_lng, next.center_zip, next.radius_miles, id);
  return getTerritory(id);
}

export function listTrucks(): Truck[] {
  return (db.prepare("SELECT * FROM trucks").all() as Record<string, unknown>[]).map(
    rowToTruck
  );
}

export function updateTruckLocation(
  id: string,
  lat: number,
  lng: number,
  status?: Truck["status"]
): Truck {
  const now = new Date().toISOString();
  if (status) {
    db.prepare(
      "UPDATE trucks SET lat=?, lng=?, status=?, updated_at=? WHERE id=?"
    ).run(lat, lng, status, now, id);
  } else {
    db.prepare("UPDATE trucks SET lat=?, lng=?, updated_at=? WHERE id=?").run(
      lat,
      lng,
      now,
      id
    );
  }
  const row = db.prepare("SELECT * FROM trucks WHERE id = ?").get(id);
  return rowToTruck(row as Record<string, unknown>);
}

export function listLeads(
  territoryId = DEFAULT_TERRITORY_ID,
  options: { minScore?: number; status?: string[]; mode?: "fish" | "jobs" } = {}
): Lead[] {
  const territory = getTerritory(territoryId);
  const statuses = options.status ?? ["open", "reviewing", "contacted", "quoted", "assigned"];
  const placeholders = statuses.map(() => "?").join(",");

  let sql = `SELECT * FROM leads WHERE territory_id = ? AND status IN (${placeholders})`;
  const params: unknown[] = [territoryId, ...statuses];

  if (options.minScore !== undefined) {
    sql += " AND score >= ?";
    params.push(options.minScore);
  }

  if (options.mode === "jobs") {
    sql += " AND contactable = 1";
  }

  sql += " ORDER BY score DESC, reported_at ASC";

  const leads = (db.prepare(sql).all(...params) as Record<string, unknown>[]).map(
    rowToLead
  );

  if (options.minScore === undefined) {
    return leads.filter((l) => l.score >= territory.alert_visible_threshold);
  }
  return leads;
}

export function getLead(id: string): Lead | null {
  const row = db.prepare("SELECT * FROM leads WHERE id = ?").get(id);
  return row ? rowToLead(row as Record<string, unknown>) : null;
}

export function upsertLead(
  input: CreateLeadInput,
  territoryId = DEFAULT_TERRITORY_ID
): { lead: Lead; isNew: boolean } {
  const territory = getTerritory(territoryId);
  const trucks = listTrucks();

  if (
    !inTerritory(
      input.lat,
      input.lng,
      territory.center_lat,
      territory.center_lng,
      territory.radius_miles
    )
  ) {
    throw new Error("Lead location is outside territory");
  }

  const provider = input.source_provider ?? input.source_type;
  const externalId = input.source_external_id ?? null;

  let existing: Lead | null = null;
  if (externalId) {
    const row = db
      .prepare(
        "SELECT * FROM leads WHERE source_provider = ? AND source_external_id = ?"
      )
      .get(provider, externalId);
    if (row) existing = rowToLead(row as Record<string, unknown>);
  }

  const now = new Date();
  const reportedAt = input.reported_at ?? now.toISOString();
  const expiresAt = new Date(
    now.getTime() + territory.auto_expire_minutes * 60 * 1000
  ).toISOString();

  const scored = scoreLead(
    {
      source_type: input.source_type,
      lat: input.lat,
      lng: input.lng,
      reported_at: reportedAt,
      contactable: input.contactable ?? false,
      roadway: input.roadway ?? null,
    },
    territory,
    trucks
  );

  const issueCategory = input.issue_category ?? classifyIssue(input.issue_description);
  const issueConfidence = input.issue_confidence ?? estimateConfidence(input.issue_description);

  const tags: string[] = [];
  if (scored.nearest_corridor_id) tags.push("highway");
  if (input.contactable) tags.push("contactable");
  else tags.push("no_contact");

  if (existing) {
    db.prepare(
      `UPDATE leads SET
        issue_category=?, issue_description=?, issue_confidence=?,
        lat=?, lng=?, roadway=?, direction=?,
        distance_from_center_miles=?, nearest_corridor_id=?,
        contactable=?, contact_phone=?, contact_method=?,
        score=?, score_breakdown=?, nearest_truck_id=?, nearest_truck_eta_minutes=?,
        marketplace_offer_id=?, marketplace_payout=?, marketplace_expires_at=?,
        tags=?, expires_at=?, updated_at=?
       WHERE id=?`
    ).run(
      issueCategory,
      input.issue_description,
      issueConfidence,
      input.lat,
      input.lng,
      input.roadway ?? null,
      input.direction ?? null,
      scored.distance_from_center_miles,
      scored.nearest_corridor_id,
      input.contactable ? 1 : 0,
      input.contact_phone ?? null,
      input.contact_method ?? null,
      scored.score,
      JSON.stringify(scored.breakdown),
      scored.nearest_truck_id,
      scored.nearest_truck_eta_minutes,
      input.marketplace_offer_id ?? null,
      input.marketplace_payout ?? null,
      input.marketplace_expires_at ?? null,
      JSON.stringify(tags),
      expiresAt,
      now.toISOString(),
      existing.id
    );
    return { lead: getLead(existing.id)!, isNew: false };
  }

  const id = uuid();
  db.prepare(
    `INSERT INTO leads (
      id, cluster_id, territory_id, status, source_type, source_provider,
      source_external_id, source_external_url, issue_category, issue_description,
      issue_confidence, lat, lng, roadway, direction, distance_from_center_miles,
      nearest_corridor_id, contactable, contact_name, contact_phone, contact_method,
      social_platform, social_url, score, score_breakdown, nearest_truck_id,
      nearest_truck_eta_minutes, marketplace_offer_id, marketplace_payout,
      marketplace_expires_at, tags, reported_at, expires_at, created_at, updated_at
    ) VALUES (
      ?, ?, ?, 'open', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
    )`
  ).run(
    id,
    null,
    territoryId,
    input.source_type,
    provider,
    externalId,
    input.source_external_url ?? null,
    issueCategory,
    input.issue_description,
    issueConfidence,
    input.lat,
    input.lng,
    input.roadway ?? null,
    input.direction ?? null,
    scored.distance_from_center_miles,
    scored.nearest_corridor_id,
    input.contactable ? 1 : 0,
    input.contact_name ?? null,
    input.contact_phone ?? null,
    input.contact_method ?? null,
    input.social_platform ?? null,
    input.social_url ?? null,
    scored.score,
    JSON.stringify(scored.breakdown),
    scored.nearest_truck_id,
    scored.nearest_truck_eta_minutes,
    input.marketplace_offer_id ?? null,
    input.marketplace_payout ?? null,
    input.marketplace_expires_at ?? null,
    JSON.stringify(tags),
    reportedAt,
    expiresAt,
    now.toISOString(),
    now.toISOString()
  );

  return { lead: getLead(id)!, isNew: true };
}

export function updateLeadStatus(id: string, status: LeadStatus): Lead {
  const now = new Date().toISOString();
  db.prepare("UPDATE leads SET status=?, updated_at=? WHERE id=?").run(
    status,
    now,
    id
  );
  return getLead(id)!;
}

export function assignLeadToTruck(
  leadId: string,
  truckId: string,
  quoteAmount = 125
): { lead: Lead; job: Job } {
  const now = new Date().toISOString();
  const lead = getLead(leadId);
  if (!lead) throw new Error("Lead not found");

  db.prepare(
    "UPDATE leads SET status='assigned', assigned_truck_id=?, updated_at=? WHERE id=?"
  ).run(truckId, now, leadId);

  db.prepare(
    "UPDATE trucks SET status='en_route', updated_at=? WHERE id=?"
  ).run(now, truckId);

  const jobId = uuid();
  db.prepare(
    `INSERT INTO jobs (id, lead_id, territory_id, truck_id, status, quote_amount, customer_phone, created_at)
     VALUES (?, ?, ?, ?, 'en_route', ?, ?, ?)`
  ).run(
    jobId,
    leadId,
    lead.territory_id,
    truckId,
    quoteAmount,
    lead.contact_phone,
    now
  );

  const jobRow = db.prepare("SELECT * FROM jobs WHERE id = ?").get(jobId);
  const job = jobRow as Job;

  return { lead: getLead(leadId)!, job };
}

export function expireStaleLeads(): number {
  const now = new Date().toISOString();
  const result = db
    .prepare(
      `UPDATE leads SET status='expired', updated_at=?
       WHERE status IN ('open','reviewing','contacted','quoted') AND expires_at < ?`
    )
    .run(now, now);
  return result.changes;
}

export function rescoreAllLeads(): void {
  const territory = getTerritory();
  const trucks = listTrucks();
  const leads = db
    .prepare(
      "SELECT * FROM leads WHERE status IN ('open','reviewing','contacted','quoted','assigned')"
    )
    .all() as Record<string, unknown>[];

  for (const row of leads) {
    const lead = rowToLead(row);
    const scored = scoreLead(
      {
        source_type: lead.source_type,
        lat: lead.lat,
        lng: lead.lng,
        reported_at: lead.reported_at,
        contactable: lead.contactable,
        roadway: lead.roadway,
      },
      territory,
      trucks
    );
    db.prepare(
      `UPDATE leads SET score=?, score_breakdown=?, nearest_truck_id=?,
       nearest_truck_eta_minutes=?, distance_from_center_miles=?, nearest_corridor_id=?, updated_at=?
       WHERE id=?`
    ).run(
      scored.score,
      JSON.stringify(scored.breakdown),
      scored.nearest_truck_id,
      scored.nearest_truck_eta_minutes,
      scored.distance_from_center_miles,
      scored.nearest_corridor_id,
      new Date().toISOString(),
      lead.id
    );
  }
}

export function getQuoteTemplates(territoryId = DEFAULT_TERRITORY_ID) {
  return db
    .prepare("SELECT * FROM quote_templates WHERE territory_id = ?")
    .all(territoryId);
}

export { db, DEFAULT_TERRITORY_ID };

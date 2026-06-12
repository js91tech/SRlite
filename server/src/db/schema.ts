export const MIGRATION_SQL = `
CREATE TABLE IF NOT EXISTS territories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  active INTEGER NOT NULL DEFAULT 1,
  center_lat REAL NOT NULL,
  center_lng REAL NOT NULL,
  center_zip TEXT NOT NULL,
  radius_miles REAL NOT NULL,
  hot_corridors TEXT NOT NULL DEFAULT '[]',
  source_weights TEXT NOT NULL DEFAULT '{}',
  alert_sound_threshold INTEGER NOT NULL DEFAULT 80,
  alert_visible_threshold INTEGER NOT NULL DEFAULT 50,
  auto_expire_minutes INTEGER NOT NULL DEFAULT 20
);

CREATE TABLE IF NOT EXISTS trucks (
  id TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  type TEXT NOT NULL,
  capabilities TEXT NOT NULL DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'available',
  lat REAL NOT NULL,
  lng REAL NOT NULL,
  driver_name TEXT,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS leads (
  id TEXT PRIMARY KEY,
  cluster_id TEXT,
  territory_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  source_type TEXT NOT NULL,
  source_provider TEXT NOT NULL,
  source_external_id TEXT,
  source_external_url TEXT,
  issue_category TEXT NOT NULL DEFAULT 'unknown',
  issue_description TEXT NOT NULL,
  issue_confidence REAL NOT NULL DEFAULT 0.5,
  lat REAL NOT NULL,
  lng REAL NOT NULL,
  roadway TEXT,
  direction TEXT,
  distance_from_center_miles REAL NOT NULL DEFAULT 0,
  nearest_corridor_id TEXT,
  contactable INTEGER NOT NULL DEFAULT 0,
  contact_name TEXT,
  contact_phone TEXT,
  contact_method TEXT,
  social_platform TEXT,
  social_url TEXT,
  score INTEGER NOT NULL DEFAULT 0,
  score_breakdown TEXT NOT NULL DEFAULT '{}',
  nearest_truck_id TEXT,
  nearest_truck_eta_minutes INTEGER,
  assigned_truck_id TEXT,
  marketplace_offer_id TEXT,
  marketplace_payout REAL,
  marketplace_expires_at TEXT,
  tags TEXT NOT NULL DEFAULT '[]',
  reported_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (territory_id) REFERENCES territories(id)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_leads_external
  ON leads(source_provider, source_external_id)
  WHERE source_external_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_leads_territory_status_score
  ON leads(territory_id, status, score DESC);

CREATE TABLE IF NOT EXISTS jobs (
  id TEXT PRIMARY KEY,
  lead_id TEXT NOT NULL,
  territory_id TEXT NOT NULL,
  truck_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'en_route',
  quote_amount REAL NOT NULL DEFAULT 0,
  customer_phone TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (lead_id) REFERENCES leads(id),
  FOREIGN KEY (truck_id) REFERENCES trucks(id)
);

CREATE TABLE IF NOT EXISTS quote_templates (
  id TEXT PRIMARY KEY,
  territory_id TEXT NOT NULL,
  name TEXT NOT NULL,
  service_type TEXT NOT NULL,
  base_price REAL NOT NULL,
  sms_template TEXT NOT NULL
);
`;

export type LeadStatus =
  | "open"
  | "reviewing"
  | "contacted"
  | "quoted"
  | "assigned"
  | "won"
  | "lost"
  | "expired"
  | "dismissed";

export type SourceType =
  | "self_report"
  | "inbound_call"
  | "honk"
  | "urgently"
  | "motor_club_email"
  | "partner_referral"
  | "social"
  | "police_rotation"
  | "gdot_511"
  | "demo";

export type TruckStatus = "available" | "en_route" | "on_scene" | "off_duty";

export type IssueCategory =
  | "tow"
  | "jump_start"
  | "tire"
  | "fuel"
  | "lockout"
  | "accident"
  | "disabled"
  | "unknown";

export interface HotCorridor {
  id: string;
  name: string;
  roadway_names: string[];
  boost_points: number;
}

export interface Territory {
  id: string;
  name: string;
  active: boolean;
  center_lat: number;
  center_lng: number;
  center_zip: string;
  radius_miles: number;
  hot_corridors: HotCorridor[];
  source_weights: Record<string, number>;
  alert_sound_threshold: number;
  alert_visible_threshold: number;
  auto_expire_minutes: number;
}

export interface Truck {
  id: string;
  label: string;
  type: string;
  capabilities: string[];
  status: TruckStatus;
  lat: number;
  lng: number;
  driver_name: string | null;
  updated_at: string;
}

export interface Lead {
  id: string;
  cluster_id: string | null;
  territory_id: string;
  status: LeadStatus;
  source_type: SourceType;
  source_provider: string;
  source_external_id: string | null;
  source_external_url: string | null;
  issue_category: IssueCategory;
  issue_description: string;
  issue_confidence: number;
  lat: number;
  lng: number;
  roadway: string | null;
  direction: string | null;
  distance_from_center_miles: number;
  nearest_corridor_id: string | null;
  contactable: boolean;
  contact_name: string | null;
  contact_phone: string | null;
  contact_method: string | null;
  social_platform: string | null;
  social_url: string | null;
  score: number;
  score_breakdown: Record<string, number>;
  nearest_truck_id: string | null;
  nearest_truck_eta_minutes: number | null;
  assigned_truck_id: string | null;
  marketplace_offer_id: string | null;
  marketplace_payout: number | null;
  marketplace_expires_at: string | null;
  tags: string[];
  reported_at: string;
  expires_at: string;
  created_at: string;
  updated_at: string;
}

export interface Job {
  id: string;
  lead_id: string;
  territory_id: string;
  truck_id: string;
  status: string;
  quote_amount: number;
  customer_phone: string | null;
  created_at: string;
}

export interface CreateLeadInput {
  source_type: SourceType;
  source_provider?: string;
  source_external_id?: string;
  source_external_url?: string;
  issue_category?: IssueCategory;
  issue_description: string;
  issue_confidence?: number;
  lat: number;
  lng: number;
  roadway?: string;
  direction?: string;
  contactable?: boolean;
  contact_name?: string;
  contact_phone?: string;
  contact_method?: string;
  social_platform?: string;
  social_url?: string;
  marketplace_offer_id?: string;
  marketplace_payout?: number;
  marketplace_expires_at?: string;
  reported_at?: string;
}

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

export interface Territory {
  id: string;
  name: string;
  active: boolean;
  center_lat: number;
  center_lng: number;
  center_zip: string;
  radius_miles: number;
  hot_corridors: { id: string; name: string }[];
  alert_sound_threshold: number;
  alert_visible_threshold: number;
}

export interface Truck {
  id: string;
  label: string;
  type: string;
  status: string;
  lat: number;
  lng: number;
  driver_name: string | null;
}

export interface Lead {
  id: string;
  territory_id: string;
  status: LeadStatus;
  source_type: string;
  source_provider: string;
  source_external_url: string | null;
  issue_category: string;
  issue_description: string;
  lat: number;
  lng: number;
  roadway: string | null;
  direction: string | null;
  distance_from_center_miles: number;
  contactable: boolean;
  contact_phone: string | null;
  contact_method: string | null;
  social_platform: string | null;
  social_url: string | null;
  score: number;
  nearest_truck_id: string | null;
  nearest_truck_eta_minutes: number | null;
  assigned_truck_id: string | null;
  marketplace_offer_id: string | null;
  marketplace_payout: number | null;
  tags: string[];
  reported_at: string;
  expires_at: string;
}

export interface QuoteTemplate {
  id: string;
  name: string;
  service_type: string;
  base_price: number;
  sms_template: string;
}

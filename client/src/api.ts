import type { Lead, QuoteTemplate, Territory, Truck } from "./types";

const BASE = "/api";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error ?? "Request failed");
  }
  return res.json();
}

export const api = {
  getTerritory: (id = "territory_marietta_25") =>
    request<Territory>(`/territories/${id}`),

  getTerritories: () => request<Territory[]>("/territories"),

  updateTerritory: (id: string, body: Partial<Territory>) =>
    request<Territory>(`/territories/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),

  getLeads: (mode?: "fish" | "jobs") =>
    request<Lead[]>(`/leads${mode ? `?mode=${mode}` : ""}`),

  getTrucks: () => request<Truck[]>("/trucks"),

  getQuotes: () => request<QuoteTemplate[]>("/quotes"),

  assignLead: (leadId: string, truckId: string, quoteAmount?: number) =>
    request<{ lead: Lead; job: unknown }>(`/leads/${leadId}/assign`, {
      method: "POST",
      body: JSON.stringify({ truck_id: truckId, quote_amount: quoteAmount }),
    }),

  updateLeadStatus: (leadId: string, status: string) =>
    request<Lead>(`/leads/${leadId}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }),

  createLead: (body: Record<string, unknown>) =>
    request<Lead>("/leads", { method: "POST", body: JSON.stringify(body) }),
};

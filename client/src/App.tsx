import { useCallback, useEffect, useState } from "react";
import { api } from "./api";
import { useWebSocket } from "./hooks/useWebSocket";
import { MapView } from "./components/MapView";
import { AlertTray } from "./components/AlertTray";
import { LeadDetail } from "./components/LeadDetail";
import { TerritorySettings } from "./components/TerritorySettings";
import { HelpLink } from "./components/HelpLink";
import type { Lead, QuoteTemplate, Territory, Truck } from "./types";

type Mode = "fish" | "jobs";

export default function App() {
  const [territory, setTerritory] = useState<Territory | null>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [trucks, setTrucks] = useState<Truck[]>([]);
  const [quotes, setQuotes] = useState<QuoteTemplate[]>([]);
  const [mode, setMode] = useState<Mode>("fish");
  const [contactableOnly, setContactableOnly] = useState(false);
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [alertCount, setAlertCount] = useState(0);

  const refresh = useCallback(async () => {
    const [t, l, tr, q] = await Promise.all([
      api.getTerritory(),
      api.getLeads(mode),
      api.getTrucks(),
      api.getQuotes(),
    ]);
    setTerritory(t);
    setLeads(l);
    setTrucks(tr);
    setQuotes(q);
  }, [mode]);

  useEffect(() => {
    refresh().catch(console.error);
  }, [refresh]);

  useWebSocket((msg) => {
    if (msg.type === "lead:new") {
      setAlertCount((c) => c + 1);
      try {
        const audio = new Audio(
          "data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBTGH0fPTgjMGHm7A7+OZURE="
        );
        audio.volume = 0.3;
        audio.play().catch(() => {});
      } catch {
        // ignore
      }
    }
    if (msg.type.startsWith("lead:") || msg.type === "leads:refresh") {
      refresh().catch(console.error);
    }
  });

  const selectedLead = leads.find((l) => l.id === selectedLeadId) ?? null;

  async function handleAssign(leadId: string, truckId: string, quoteAmount: number) {
    await api.assignLead(leadId, truckId, quoteAmount);
    await refresh();
  }

  async function handleDismiss(leadId: string) {
    await api.updateLeadStatus(leadId, "dismissed");
    if (selectedLeadId === leadId) setSelectedLeadId(null);
    await refresh();
  }

  async function handleStage(leadId: string) {
    const lead = leads.find((l) => l.id === leadId);
    if (!lead?.nearest_truck_id) return;
    await api.assignLead(leadId, lead.nearest_truck_id, 0);
    await refresh();
  }

  async function handleTerritorySave(updates: Partial<Territory>) {
    if (!territory) return;
    const updated = await api.updateTerritory(territory.id, updates);
    setTerritory(updated);
    await refresh();
  }

  if (!territory) {
    return <div className="loading">Loading Roadside Radar…</div>;
  }

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <h1>Roadside Radar</h1>
          <span className="territory-pill">
            {territory.name} · {territory.radius_miles}mi
          </span>
        </div>
        <div className="mode-toggle">
          <button
            className={mode === "fish" ? "active" : ""}
            onClick={() => setMode("fish")}
          >
            Fish
          </button>
          <button
            className={mode === "jobs" ? "active" : ""}
            onClick={() => setMode("jobs")}
          >
            Jobs
          </button>
        </div>
        <div className="topbar-actions">
          <label className="checkbox">
            <input
              type="checkbox"
              checked={contactableOnly}
              onChange={(e) => setContactableOnly(e.target.checked)}
            />
            Contactable only
          </label>
          <button className="btn ghost" onClick={() => setSettingsOpen(true)}>
            Territory
          </button>
          {alertCount > 0 && (
            <span className="notif-badge" title="New lead alerts this session">
              {alertCount}
            </span>
          )}
        </div>
      </header>

      <main className="layout">
        <aside className="sidebar">
          <AlertTray
            leads={leads}
            trucks={trucks}
            selectedLeadId={selectedLeadId}
            contactableOnly={contactableOnly}
            onSelect={setSelectedLeadId}
            onDismiss={handleDismiss}
            onStage={handleStage}
          />
        </aside>
        <section className="map-panel">
          <MapView
            territory={territory}
            leads={leads}
            trucks={trucks}
            selectedLeadId={selectedLeadId}
            onSelectLead={setSelectedLeadId}
          />
        </section>
      </main>

      <footer className="bottom-panel">
        <LeadDetail
          lead={selectedLead}
          trucks={trucks}
          quotes={quotes}
          onAssign={handleAssign}
          onDismiss={handleDismiss}
        />
      </footer>

      <HelpLink />

      {settingsOpen && (
        <TerritorySettings
          territory={territory}
          onSave={handleTerritorySave}
          onClose={() => setSettingsOpen(false)}
        />
      )}
    </div>
  );
}

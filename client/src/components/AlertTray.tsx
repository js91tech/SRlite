import type { Lead, Truck } from "../types";

function timeAgo(iso: string): string {
  const sec = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (sec < 60) return `${sec}s ago`;
  if (sec < 3600) return `${Math.floor(sec / 60)}m ago`;
  return `${Math.floor(sec / 3600)}h ago`;
}

function sourceLabel(lead: Lead): string {
  if (lead.source_type === "honk") return "HONK OFFER";
  if (lead.source_type === "gdot_511") return "511GA INCIDENT";
  if (lead.source_type === "social") return `${(lead.social_platform ?? "SOCIAL").toUpperCase()}`;
  if (lead.source_type === "self_report") return "SELF REPORT";
  return lead.source_type.toUpperCase().replace(/_/g, " ");
}

function scoreClass(score: number): string {
  if (score >= 90) return "alert-card hot";
  if (score >= 80) return "alert-card high";
  if (score >= 50) return "alert-card medium";
  return "alert-card low";
}

interface AlertTrayProps {
  leads: Lead[];
  trucks: Truck[];
  selectedLeadId: string | null;
  contactableOnly: boolean;
  onSelect: (id: string) => void;
  onDismiss: (id: string) => void;
  onStage: (id: string) => void;
}

export function AlertTray({
  leads,
  trucks,
  selectedLeadId,
  contactableOnly,
  onSelect,
  onDismiss,
  onStage,
}: AlertTrayProps) {
  const filtered = contactableOnly ? leads.filter((l) => l.contactable) : leads;

  return (
    <div className="alert-tray">
      <div className="alert-tray-header">
        <h2>Alert Tray</h2>
        <span className="badge">{filtered.length}</span>
      </div>
      <div className="alert-list">
        {filtered.length === 0 && (
          <p className="empty">No active leads in this mode.</p>
        )}
        {filtered.map((lead) => {
          const truck = trucks.find((t) => t.id === lead.nearest_truck_id);
          return (
            <div
              key={lead.id}
              className={`${scoreClass(lead.score)}${selectedLeadId === lead.id ? " selected" : ""}`}
              onClick={() => onSelect(lead.id)}
            >
              <div className="alert-top">
                <span className="score">{lead.score}</span>
                <span className="source">{sourceLabel(lead)}</span>
              </div>
              <p className="desc">{lead.issue_description}</p>
              <p className="meta">
                {timeAgo(lead.reported_at)}
                {lead.roadway ? ` · ${lead.roadway}` : ""}
                {truck && lead.nearest_truck_eta_minutes
                  ? ` · ${truck.label.split(" - ")[0]}: ${lead.nearest_truck_eta_minutes}m`
                  : ""}
              </p>
              <div className="alert-actions" onClick={(e) => e.stopPropagation()}>
                {lead.contactable ? (
                  <>
                    {lead.contact_phone && (
                      <a className="btn small" href={`tel:${lead.contact_phone}`}>
                        Call
                      </a>
                    )}
                    {lead.social_url && (
                      <a className="btn small" href={lead.social_url} target="_blank" rel="noreferrer">
                        Open
                      </a>
                    )}
                  </>
                ) : (
                  <button className="btn small" onClick={() => onStage(lead.id)}>
                    Stage Truck
                  </button>
                )}
                <button className="btn small ghost" onClick={() => onDismiss(lead.id)}>
                  Dismiss
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

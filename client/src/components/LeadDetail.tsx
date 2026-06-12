import type { Lead, QuoteTemplate, Truck } from "../types";

function timeAgo(iso: string): string {
  const sec = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (sec < 60) return `${sec} seconds ago`;
  if (sec < 3600) return `${Math.floor(sec / 60)} minutes ago`;
  return `${Math.floor(sec / 3600)} hours ago`;
}

interface LeadDetailProps {
  lead: Lead | null;
  trucks: Truck[];
  quotes: QuoteTemplate[];
  onAssign: (leadId: string, truckId: string, quoteAmount: number) => void;
  onDismiss: (leadId: string) => void;
}

export function LeadDetail({ lead, trucks, quotes, onAssign, onDismiss }: LeadDetailProps) {
  if (!lead) {
    return (
      <div className="lead-detail empty-detail">
        <p>Select a lead on the map or alert tray to view details and dispatch.</p>
      </div>
    );
  }

  const nearestTruck = trucks.find((t) => t.id === lead.nearest_truck_id);
  const availableTrucks = trucks.filter((t) => t.status === "available");
  const defaultQuote = quotes[0];
  const quoteAmount = defaultQuote?.base_price ?? 125;
  const eta = lead.nearest_truck_eta_minutes ?? 15;

  const smsBody = (defaultQuote?.sms_template ?? "We can reach you in ~{{eta}} min. Tow: ${{price}}")
    .replace("{{eta}}", String(eta))
    .replace("{{price}}", String(quoteAmount));

  return (
    <div className="lead-detail">
      <div className="detail-grid">
        <div>
          <span className="label">Source</span>
          <strong>{lead.source_provider} · {lead.source_type}</strong>
        </div>
        <div>
          <span className="label">Score</span>
          <strong className="score-big">{lead.score}</strong>
        </div>
        <div>
          <span className="label">Location</span>
          <strong>
            {lead.roadway ?? "Unknown road"}
            {lead.direction ? ` ${lead.direction}` : ""}
          </strong>
          <span className="sub">{lead.distance_from_center_miles} mi from center · {timeAgo(lead.reported_at)}</span>
        </div>
        <div>
          <span className="label">Issue</span>
          <strong>{lead.issue_category}</strong>
          <span className="sub">{lead.issue_description}</span>
        </div>
        {lead.marketplace_offer_id && (
          <div>
            <span className="label">Marketplace</span>
            <strong>{lead.marketplace_offer_id}</strong>
            {lead.marketplace_payout && (
              <span className="sub">Payout est. ${lead.marketplace_payout}</span>
            )}
          </div>
        )}
      </div>

      <div className="truck-row">
        <span className="label">Nearest trucks</span>
        <div className="truck-chips">
          {availableTrucks.map((t) => (
            <span key={t.id} className={`chip${t.id === lead.nearest_truck_id ? " best" : ""}`}>
              {t.label} {t.id === lead.nearest_truck_id ? `(${eta}m)` : ""}
            </span>
          ))}
        </div>
      </div>

      <div className="quote-preview">
        <span className="label">SMS preview</span>
        <p>{smsBody}</p>
      </div>

      <div className="detail-actions">
        {nearestTruck && (
          <button
            className="btn primary"
            onClick={() => onAssign(lead.id, nearestTruck.id, quoteAmount)}
          >
            Accept &amp; Assign {nearestTruck.label.split(" - ")[0]}
          </button>
        )}
        {lead.contact_phone && (
          <a className="btn" href={`tel:${lead.contact_phone}`}>
            Call Customer
          </a>
        )}
        {lead.contact_phone && (
          <a
            className="btn"
            href={`sms:${lead.contact_phone}?body=${encodeURIComponent(smsBody)}`}
          >
            Text Quote
          </a>
        )}
        <button className="btn ghost" onClick={() => onDismiss(lead.id)}>
          Dismiss
        </button>
      </div>
    </div>
  );
}

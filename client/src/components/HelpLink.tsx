import { useState } from "react";
import { api } from "../api";

export function HelpLink() {
  const [open, setOpen] = useState(false);
  const [phone, setPhone] = useState("");
  const [issue, setIssue] = useState("Need roadside assistance");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [error, setError] = useState("");

  async function submit() {
    setStatus("sending");
    setError("");
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 15000,
        })
      );
      await api.createLead({
        source_type: "self_report",
        source_provider: "your_app",
        issue_description: issue,
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        contactable: true,
        contact_phone: phone || undefined,
        contact_method: phone ? "sms" : "web",
      });
      setStatus("sent");
    } catch (e) {
      setStatus("error");
      setError((e as Error).message);
    }
  }

  if (!open) {
    return (
      <button className="btn help-fab" onClick={() => setOpen(true)} title="Driver help link">
        + Report
      </button>
    );
  }

  return (
    <div className="modal-backdrop" onClick={() => setOpen(false)}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>Driver Self-Report</h2>
        <p className="sub">Simulates your branded help link for stranded drivers.</p>
        {status === "sent" ? (
          <p className="success">Report sent! Dispatch will see it on the map.</p>
        ) : (
          <>
            <label>
              Phone (optional)
              <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+16785550123" />
            </label>
            <label>
              What happened?
              <textarea value={issue} onChange={(e) => setIssue(e.target.value)} rows={3} />
            </label>
            {error && <p className="error">{error}</p>}
            <div className="modal-actions">
              <button className="btn ghost" onClick={() => setOpen(false)}>Cancel</button>
              <button className="btn primary" onClick={submit} disabled={status === "sending"}>
                {status === "sending" ? "Getting GPS…" : "Send Help Request"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

import { useState } from "react";
import type { Territory } from "../types";

interface TerritorySettingsProps {
  territory: Territory;
  onSave: (updates: Partial<Territory>) => Promise<void>;
  onClose: () => void;
}

export function TerritorySettings({ territory, onSave, onClose }: TerritorySettingsProps) {
  const [zip, setZip] = useState(territory.center_zip);
  const [radius, setRadius] = useState(territory.radius_miles);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      await onSave({ center_zip: zip, radius_miles: radius });
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>Territory Settings</h2>
        <p className="sub">Change zip + radius to retarget your fishing zone.</p>
        <label>
          Center ZIP
          <input value={zip} onChange={(e) => setZip(e.target.value)} />
        </label>
        <label>
          Radius (miles)
          <input
            type="number"
            min={5}
            max={100}
            value={radius}
            onChange={(e) => setRadius(parseFloat(e.target.value))}
          />
        </label>
        <p className="hint">
          Center: {territory.center_lat.toFixed(4)}, {territory.center_lng.toFixed(4)}
        </p>
        <div className="modal-actions">
          <button className="btn ghost" onClick={onClose}>Cancel</button>
          <button className="btn primary" onClick={handleSave} disabled={saving}>
            {saving ? "Saving…" : "Save Territory"}
          </button>
        </div>
      </div>
    </div>
  );
}

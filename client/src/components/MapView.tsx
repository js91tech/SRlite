import { Circle, MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";
import { useEffect } from "react";
import type { Lead, Territory, Truck } from "../types";

const leadIcon = (score: number) =>
  L.divIcon({
    className: "",
    html: `<div style="
      width:14px;height:14px;border-radius:50%;
      background:${score >= 80 ? "#ef4444" : score >= 50 ? "#f97316" : "#9ca3af"};
      border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,.4);
    "></div>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  });

const truckIcon = (status: string) =>
  L.divIcon({
    className: "",
    html: `<div style="
      width:22px;height:22px;border-radius:4px;
      background:${status === "available" ? "#22c55e" : status === "en_route" ? "#eab308" : "#6b7280"};
      border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,.4);
      display:flex;align-items:center;justify-content:center;
      font-size:10px;color:white;font-weight:bold;
    ">T</div>`,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
  });

function FitBounds({
  territory,
  leads,
  trucks,
}: {
  territory: Territory;
  leads: Lead[];
  trucks: Truck[];
}) {
  const map = useMap();
  useEffect(() => {
    const points: [number, number][] = [
      [territory.center_lat, territory.center_lng],
      ...leads.map((l) => [l.lat, l.lng] as [number, number]),
      ...trucks.map((t) => [t.lat, t.lng] as [number, number]),
    ];
    if (points.length > 1) {
      map.fitBounds(L.latLngBounds(points), { padding: [40, 40], maxZoom: 11 });
    }
  }, [map, territory, leads, trucks]);
  return null;
}

interface MapViewProps {
  territory: Territory;
  leads: Lead[];
  trucks: Truck[];
  selectedLeadId: string | null;
  onSelectLead: (id: string) => void;
}

export function MapView({
  territory,
  leads,
  trucks,
  selectedLeadId,
  onSelectLead,
}: MapViewProps) {
  const radiusMeters = territory.radius_miles * 1609.34;

  return (
    <MapContainer
      center={[territory.center_lat, territory.center_lng]}
      zoom={10}
      style={{ height: "100%", width: "100%" }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <Circle
        center={[territory.center_lat, territory.center_lng]}
        radius={radiusMeters}
        pathOptions={{ color: "#3b82f6", fillColor: "#3b82f6", fillOpacity: 0.06, weight: 2, dashArray: "6 6" }}
      />
      <FitBounds territory={territory} leads={leads} trucks={trucks} />
      {leads.map((lead) => (
        <Marker
          key={lead.id}
          position={[lead.lat, lead.lng]}
          icon={leadIcon(lead.score)}
          eventHandlers={{ click: () => onSelectLead(lead.id) }}
          opacity={selectedLeadId && selectedLeadId !== lead.id ? 0.6 : 1}
        >
          <Popup>
            <strong>Score {lead.score}</strong>
            <br />
            {lead.issue_description.slice(0, 80)}
          </Popup>
        </Marker>
      ))}
      {trucks.map((truck) => (
        <Marker
          key={truck.id}
          position={[truck.lat, truck.lng]}
          icon={truckIcon(truck.status)}
        >
          <Popup>
            <strong>{truck.label}</strong>
            <br />
            {truck.driver_name ?? "Unassigned"} · {truck.status}
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}

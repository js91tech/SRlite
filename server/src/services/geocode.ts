const ZIP_CENTROIDS: Record<string, { lat: number; lng: number }> = {
  "30060": { lat: 33.9526, lng: -84.5499 },
  "30062": { lat: 34.0234, lng: -84.4647 },
  "30064": { lat: 33.9168, lng: -84.5802 },
  "30066": { lat: 34.0187, lng: -84.5167 },
  "30067": { lat: 33.9890, lng: -84.4227 },
  "30068": { lat: 33.9782, lng: -84.4194 },
  "30008": { lat: 33.8834, lng: -84.5894 },
  "30144": { lat: 34.0234, lng: -84.6155 },
  "30339": { lat: 33.8839, lng: -84.4613 },
  "30080": { lat: 33.8834, lng: -84.5144 },
};

export async function geocodeZip(zip: string): Promise<{ lat: number; lng: number }> {
  const clean = zip.trim().slice(0, 5);
  if (ZIP_CENTROIDS[clean]) return ZIP_CENTROIDS[clean];

  const url = `https://nominatim.openstreetmap.org/search?postalcode=${clean}&country=US&format=json&limit=1`;
  const resp = await fetch(url, {
    headers: { "User-Agent": "RoadsideRadar/0.1" },
    signal: AbortSignal.timeout(10000),
  });
  if (!resp.ok) throw new Error(`Geocode failed: ${resp.status}`);

  const data = (await resp.json()) as { lat: string; lon: string }[];
  if (!data.length) throw new Error(`Unknown zip: ${clean}`);

  return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
}

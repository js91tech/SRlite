const EARTH_RADIUS_MILES = 3958.8;

export function haversineMiles(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const p = Math.PI / 180;
  const a =
    0.5 -
    Math.cos((lat2 - lat1) * p) / 2 +
    (Math.cos(lat1 * p) *
      Math.cos(lat2 * p) *
      (1 - Math.cos((lng2 - lng1) * p))) /
      2;
  return 2 * EARTH_RADIUS_MILES * Math.asin(Math.sqrt(a));
}

export function inTerritory(
  lat: number,
  lng: number,
  centerLat: number,
  centerLng: number,
  radiusMiles: number
): boolean {
  return haversineMiles(centerLat, centerLng, lat, lng) <= radiusMiles;
}

export function estimateEtaMinutes(distanceMiles: number): number {
  const avgSpeedMph = 35;
  return Math.max(1, Math.round((distanceMiles / avgSpeedMph) * 60));
}

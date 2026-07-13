const EARTH_RADIUS_KM = 6371.0088;

function validCoordinate(latitude: unknown, longitude: unknown): boolean {
  return typeof latitude === 'number' && Number.isFinite(latitude)
    && typeof longitude === 'number' && Number.isFinite(longitude)
    && latitude >= -90 && latitude <= 90 && longitude >= -180 && longitude <= 180;
}

export function distanceBetweenKm(
  fromLatitude: unknown,
  fromLongitude: unknown,
  toLatitude: unknown,
  toLongitude: unknown,
): number | null {
  if (!validCoordinate(fromLatitude, fromLongitude) || !validCoordinate(toLatitude, toLongitude)) return null;
  const fromLat = fromLatitude as number;
  const fromLon = fromLongitude as number;
  const toLat = toLatitude as number;
  const toLon = toLongitude as number;
  const radians = (value: number) => value * Math.PI / 180;
  const latDelta = radians(toLat - fromLat);
  const lonDelta = radians(toLon - fromLon);
  const a = Math.sin(latDelta / 2) ** 2
    + Math.cos(radians(fromLat)) * Math.cos(radians(toLat)) * Math.sin(lonDelta / 2) ** 2;
  const distance = EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(distance * 1000) / 1000;
}

/**
 * ISS map-sync helpers: ground-track bearing and follow camera defaults.
 * Zoom is owned by the operator — follow never writes zoom.
 */

export const ISS_NORAD_ID = '25544';

/** Nadir-ish look-down while locked to the station. */
export const ISS_FOLLOW_PITCH = 75;

/** Default zoom only when sync first engages and the map is still world-scale. */
export const ISS_FOLLOW_DEFAULT_ZOOM = 4.5;

/**
 * Initial bearing (degrees clockwise from north) of the great-circle from A→B.
 */
export function groundTrackBearing(
  from: { lat: number; lng: number },
  to: { lat: number; lng: number },
): number {
  const φ1 = (from.lat * Math.PI) / 180;
  const φ2 = (to.lat * Math.PI) / 180;
  const Δλ = ((to.lng - from.lng) * Math.PI) / 180;
  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  const θ = Math.atan2(y, x);
  return ((θ * 180) / Math.PI + 360) % 360;
}

export interface IssFollowTarget {
  lat: number;
  lng: number;
  altKm: number;
  bearing: number;
}

/** Bearing from a short forward sample (default 20s along-track). */
export function issFollowFromPositions(
  now: { lat: number; lng: number; altKm: number },
  ahead: { lat: number; lng: number },
): IssFollowTarget {
  return {
    lat: now.lat,
    lng: now.lng,
    altKm: now.altKm,
    bearing: groundTrackBearing(now, ahead),
  };
}

/**
 * ISS map-sync helpers: ground-track bearing and follow camera defaults.
 * Zoom is owned by the operator — follow never writes zoom.
 */

export const ISS_NORAD_ID = '25544';

/** Nadir-ish look-down while locked to the station. */
export const ISS_FOLLOW_PITCH = 75;

/**
 * Horizontal FOV for initial MAP SYNC framing. Tuned to Sen / ISS Earth cams
 * so the first lock reads like the video, not a continental overview.
 */
export const ISS_FOLLOW_CAMERA_FOV_DEG = 68;

/** Fallback when altitude is unknown — ~408 km station height. */
export const ISS_FOLLOW_ALT_KM = 408;

/** First-lock ease into the frame (then rAF jumpTo takes over). */
export const ISS_FOLLOW_LOCK_MS = 1200;

/** How often to refresh the TLE while MAP SYNC stays on. */
export const ISS_FOLLOW_TLE_REFRESH_MS = 10 * 60_000;

/**
 * MapLibre zoom whose viewport width ≈ the ground swath of an ISS camera.
 *
 * Web Mercator meters/pixel at z0 ≈ 156543; ground width ≈ 2 · h · tan(FOV/2).
 */
export function issFollowZoomForFrame(
  altKm: number = ISS_FOLLOW_ALT_KM,
  opts?: { fovDeg?: number; viewportCssWidth?: number; latitude?: number },
): number {
  const fovDeg = opts?.fovDeg ?? ISS_FOLLOW_CAMERA_FOV_DEG;
  const viewportCssWidth = opts?.viewportCssWidth ?? 960;
  const lat = opts?.latitude ?? 0;
  const h = Number.isFinite(altKm) && altKm > 80 ? altKm : ISS_FOLLOW_ALT_KM;
  const half = ((fovDeg / 2) * Math.PI) / 180;
  const groundWidthM = 2 * h * 1000 * Math.tan(half);
  const mPerPxZ0 = 156543.03392 * Math.cos((lat * Math.PI) / 180);
  if (!(groundWidthM > 0) || !(mPerPxZ0 > 0)) return 6.5;
  const z = Math.log2((viewportCssWidth * mPerPxZ0) / groundWidthM);
  // Clamp to a video-like regional frame (not world, not street).
  return Math.min(9.2, Math.max(7.2, Math.round(z * 10) / 10));
}

/** @deprecated use issFollowZoomForFrame — kept as the nominal first-lock zoom at 408 km. */
export const ISS_FOLLOW_DEFAULT_ZOOM = issFollowZoomForFrame(ISS_FOLLOW_ALT_KM);

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

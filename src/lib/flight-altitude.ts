/**
 * Aircraft display elevation for MapLibre (atmospheric band, metres baro).
 * Separate from satellite-layer displayElevation (compressed orbital altitudes).
 */

/** Baro altitudes above this are treated as airborne for display. */
export const FLIGHT_NEAR_GROUND_ALT_M = 30;

/** Upper bound of the atmospheric display band (real metres). */
export const FLIGHT_MAX_ATM_ALT_M = 12_000;

/** Display metres at full exaggeration for cruise altitude. */
const DISPLAY_CEILING_M = 6_000;

/** Minimum exaggeration multiplier (near-nadir / world zoom). */
const EXAG_MIN = 0.22;

/** Maximum exaggeration multiplier (pitched regional view). */
const EXAG_MAX = 1.35;

/** Pitch (deg) at or below which the view stays visually flat. */
const PITCH_FLAT_MAX = 15;

/** Pitch (deg) at or above which regional separation is full. */
const PITCH_LIFT_MIN = 40;

/** World zoom at or below which altitude stays flatter. */
const ZOOM_WORLD_MAX = 4;

/** Regional zoom band where pitched views lift the most. */
const ZOOM_REGIONAL_MIN = 6;
const ZOOM_REGIONAL_MAX = 12;

/** Minimum pitch (deg) to show ground→aircraft stems. */
const STEM_PITCH_MIN = 25;

/** Minimum zoom (exclusive) for stems — must be above world view. */
const STEM_ZOOM_MIN = 4;

/** Half-width of stem footprint in degrees (~1–2 m at mid-latitudes). */
const STEM_HALF_DEG = 0.000012;

function clamp01(t: number): number {
  if (!Number.isFinite(t)) return 0;
  return Math.min(1, Math.max(0, t));
}

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = clamp01((x - edge0) / (edge1 - edge0));
  return t * t * (3 - 2 * t);
}

/** Zoom/pitch blend: 0 = flattest, 1 = fullest regional lift. */
export function flightExaggerationBlend(zoom: number, pitch: number): number {
  const pitchLift = smoothstep(PITCH_FLAT_MAX, PITCH_LIFT_MIN, pitch);

  let zoomLift = 0;
  if (zoom <= ZOOM_WORLD_MAX) {
    zoomLift = 0;
  } else if (zoom < ZOOM_REGIONAL_MIN) {
    zoomLift = smoothstep(ZOOM_WORLD_MAX, ZOOM_REGIONAL_MIN, zoom) * 0.45;
  } else if (zoom <= ZOOM_REGIONAL_MAX) {
    zoomLift = 0.45 + 0.55 * smoothstep(ZOOM_REGIONAL_MIN, ZOOM_REGIONAL_MAX, zoom);
  } else {
    zoomLift = 1 - 0.25 * smoothstep(ZOOM_REGIONAL_MAX, ZOOM_REGIONAL_MAX + 4, zoom);
  }

  const regionalBoost =
    pitch >= PITCH_LIFT_MIN && zoom >= ZOOM_REGIONAL_MIN && zoom <= ZOOM_REGIONAL_MAX ? 0.12 : 0;

  const blend = clamp01(pitchLift * zoomLift + regionalBoost);
  return EXAG_MIN + (EXAG_MAX - EXAG_MIN) * blend;
}

/**
 * Map real barometric altitude (m) to MapLibre display elevation (m).
 * Grounded, missing, or near-zero alt → 0.
 */
export function flightDisplayElevation(
  altM: number,
  opts: { zoom: number; pitch: number },
): number {
  if (!Number.isFinite(altM) || altM <= FLIGHT_NEAR_GROUND_ALT_M) return 0;
  const clamped = Math.min(altM, FLIGHT_MAX_ATM_ALT_M);
  const t = clamped / FLIGHT_MAX_ATM_ALT_M;
  const base = t * DISPLAY_CEILING_M;
  const exag = flightExaggerationBlend(opts.zoom, opts.pitch);
  return base * exag;
}

/** True when pitch and zoom make vertical separation readable. */
export function flightStemsVisible(zoom: number, pitch: number): boolean {
  if (!Number.isFinite(zoom) || !Number.isFinite(pitch)) return false;
  return zoom > STEM_ZOOM_MIN && pitch >= STEM_PITCH_MIN;
}

/**
 * Tiny vertical extrusion footprint at (lng, lat) for fill-extrusion-height.
 */
export function flightStemFeature(lng: number, lat: number, elevM: number): GeoJSON.Feature {
  const h = STEM_HALF_DEG;
  const ring: GeoJSON.Position[] = [
    [lng - h, lat - h],
    [lng + h, lat - h],
    [lng + h, lat + h],
    [lng - h, lat + h],
    [lng - h, lat - h],
  ];
  return {
    type: 'Feature',
    properties: { elev: elevM, height: elevM },
    geometry: {
      type: 'Polygon',
      coordinates: [ring],
    },
  };
}

export type FlightStemPoint = {
  lng: number;
  lat: number;
  alt?: number | null;
  grounded?: boolean;
};

/** Stem features for airborne craft when stems are visible and elev > 0. */
export function buildFlightStemFeatures(
  points: FlightStemPoint[],
  opts: { zoom: number; pitch: number },
): GeoJSON.Feature[] {
  if (!flightStemsVisible(opts.zoom, opts.pitch)) return [];
  const out: GeoJSON.Feature[] = [];
  for (const p of points) {
    if (p.grounded) continue;
    const elev = flightDisplayElevation(p.alt ?? NaN, opts);
    if (elev <= 0) continue;
    out.push(flightStemFeature(p.lng, p.lat, elev));
  }
  return out;
}

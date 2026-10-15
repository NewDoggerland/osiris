import type { Feature, FeatureCollection, LineString, Position } from 'geojson';
import type { BBox } from './types';
import { fillBbox, overpassQuery } from './overpass';
import { featureOf, emptyFc, capFeatures } from './geojson';
import {
  agenciesForBbox,
  decodeVehiclePositions,
  mergeGtfsFc,
  type GtfsAgency,
} from './gtfs';

const TRACKS_MIN_ZOOM = 8;

const TRACKS_QL = `[out:json][timeout:25];
(
  way["railway"="rail"]({{bbox}});
  way["railway"="light_rail"]({{bbox}});
  way["railway"="subway"]({{bbox}});
  way["railway"="narrow_gauge"]({{bbox}});
);
out geom;
`;

export function trainsTracksQl(bbox: BBox): string {
  return fillBbox(TRACKS_QL, bbox);
}

function wayLineGeometry(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  el: any,
): LineString | null {
  const geom = el?.geometry;
  if (!Array.isArray(geom) || geom.length < 2) return null;
  const coordinates: Position[] = [];
  for (const g of geom) {
    const lat = g?.lat;
    const lon = g?.lon;
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;
    coordinates.push([lon, lat]);
  }
  if (coordinates.length < 2) return null;
  return { type: 'LineString', coordinates };
}

/** Map Overpass ways to ground_train_tracks LineStrings. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function mapTrainTracksToFc(data: any): FeatureCollection {
  const elements = data?.elements;
  if (!Array.isArray(elements)) return emptyFc();
  const features: Feature[] = [];
  for (const el of elements) {
    if (el?.type !== 'way') continue;
    const line = wayLineGeometry(el);
    if (!line) continue;
    const tags = (el?.tags ?? {}) as Record<string, string>;
    const id = el?.id ?? features.length;
    features.push(
      featureOf(`train-track-${id}`, line, {
        kind: 'ground_train_tracks',
        name: tags.name ?? tags['name:en'] ?? null,
        railway: tags.railway ?? null,
        osmId: id,
        attribution: 'OpenStreetMap',
      }),
    );
  }
  return capFeatures({ type: 'FeatureCollection', features }, 4000);
}

export function resolveTrainVehicleUrl(agency: GtfsAgency): string | null {
  let url = agency.vehicleUrl;
  if (!url) return null;
  if (agency.apiKeyEnv) {
    const key = process.env[agency.apiKeyEnv];
    if (!key) return null;
    url += (url.includes('?') ? '&' : '?') + `api_key=${encodeURIComponent(key)}`;
  }
  return url;
}

export async function fetchTrainAgencyVehicles(
  agency: GtfsAgency,
  bbox: BBox,
): Promise<FeatureCollection> {
  const url = resolveTrainVehicleUrl(agency);
  if (!url) return emptyFc();
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(12_000),
      headers: {
        'User-Agent': 'osiris-layers/1.0',
        Accept: 'application/x-protobuf, application/octet-stream, */*',
      },
    });
    if (!res.ok) return emptyFc();
    const buf = new Uint8Array(await res.arrayBuffer());
    return decodeVehiclePositions(buf, agency, bbox, 'ground_trains');
  } catch {
    return emptyFc();
  }
}

export async function fetchTrainTracks(bbox: BBox, zoom: number): Promise<FeatureCollection> {
  if (zoom < TRACKS_MIN_ZOOM) return emptyFc();
  try {
    const data = await overpassQuery(trainsTracksQl(bbox));
    return mapTrainTracksToFc(data);
  } catch {
    return emptyFc();
  }
}

export function mergeTrainsFc(
  vehicles: FeatureCollection,
  tracks: FeatureCollection,
  max = 6000,
): FeatureCollection {
  return mergeGtfsFc([tracks, vehicles], max);
}

export { agenciesForBbox, TRACKS_MIN_ZOOM };

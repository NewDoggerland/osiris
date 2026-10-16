import { describe, it, expect } from 'vitest';
import { trailsQl, mapTrailsToFc, TRAILS_MIN_ZOOM } from './trails';

describe('TRAILS_MIN_ZOOM', () => {
  it('is 8', () => expect(TRAILS_MIN_ZOOM).toBe(8));
});

describe('trailsQl', () => {
  it('fills bbox and path selectors', () => {
    const ql = trailsQl({ west: -105.3, south: 39.9, east: -105.2, north: 40.0 });
    expect(ql).toContain('39.9,-105.3,40,-105.2');
    expect(ql).toContain('highway"~"^(path|footway|cycleway|bridleway)$"');
    expect(ql).toContain('railway"~"^(abandoned|disused)$"');
  });
});

describe('mapTrailsToFc', () => {
  it('maps ways, assigns subkind, skips private', () => {
    const fc = mapTrailsToFc({
      elements: [
        {
          type: 'way', id: 1,
          tags: { highway: 'cycleway', name: 'Creek Path' },
          geometry: [{ lat: 40, lon: -105.25 }, { lat: 40.01, lon: -105.24 }],
        },
        {
          type: 'way', id: 2,
          tags: { highway: 'path', access: 'private' },
          geometry: [{ lat: 40, lon: -105 }, { lat: 40.01, lon: -105.01 }],
        },
        {
          type: 'way', id: 3,
          tags: { railway: 'abandoned', name: 'Old Grade' },
          geometry: [{ lat: 39.95, lon: -105.2 }, { lat: 39.96, lon: -105.19 }],
        },
      ],
    });
    expect(fc.features).toHaveLength(2);
    expect(fc.features[0]!.properties?.subkind).toBe('cycle');
    expect(fc.features[1]!.properties?.subkind).toBe('rail_trail');
    expect(fc.features[0]!.properties?.kind).toBe('ground_trails');
  });
});

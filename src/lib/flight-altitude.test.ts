import { describe, expect, it } from 'vitest';
import {
  buildFlightStemFeatures,
  flightDisplayElevation,
  flightStemFeature,
  flightStemsVisible,
} from './flight-altitude';

describe('flightDisplayElevation', () => {
  const regional = { zoom: 8, pitch: 50 };

  it('returns higher display elevation for higher altitude', () => {
    const low = flightDisplayElevation(300, regional);
    const mid = flightDisplayElevation(3_000, regional);
    const high = flightDisplayElevation(10_000, regional);
    expect(mid).toBeGreaterThan(low);
    expect(high).toBeGreaterThan(mid);
  });

  it('returns 0 for grounded, missing, or near-zero altitude', () => {
    expect(flightDisplayElevation(0, regional)).toBe(0);
    expect(flightDisplayElevation(-50, regional)).toBe(0);
    expect(flightDisplayElevation(20, regional)).toBe(0);
    expect(flightDisplayElevation(NaN, regional)).toBe(0);
  });

  it('lifts more when pitched in at regional zoom than when flat or world zoom', () => {
    const alt = 9_000;
    const flat = flightDisplayElevation(alt, { zoom: 3, pitch: 0 });
    const pitched = flightDisplayElevation(alt, { zoom: 8, pitch: 50 });
    expect(pitched).toBeGreaterThan(flat);
  });
});

describe('flightStemsVisible', () => {
  it('hides stems when pitch is low or zoom is low', () => {
    expect(flightStemsVisible(8, 0)).toBe(false);
    expect(flightStemsVisible(8, 10)).toBe(false);
    expect(flightStemsVisible(3, 50)).toBe(false);
    expect(flightStemsVisible(4, 50)).toBe(false);
  });

  it('shows stems when pitched in at mid zoom', () => {
    expect(flightStemsVisible(8, 50)).toBe(true);
    expect(flightStemsVisible(10, 45)).toBe(true);
  });
});

describe('flightStemFeature', () => {
  it('builds a polygon with elev and height properties', () => {
    const f = flightStemFeature(-73.9, 40.7, 1200);
    expect(f.geometry.type).toBe('Polygon');
    expect(f.properties?.elev).toBe(1200);
    expect(f.properties?.height).toBe(1200);
  });
});

describe('buildFlightStemFeatures', () => {
  const opts = { zoom: 8, pitch: 50 };

  it('returns no features when stems are hidden', () => {
    const feats = buildFlightStemFeatures(
      [{ lng: 0, lat: 0, alt: 10_000 }],
      { zoom: 2, pitch: 60 },
    );
    expect(feats).toHaveLength(0);
  });

  it('skips grounded and zero-elevation points', () => {
    const feats = buildFlightStemFeatures(
      [
        { lng: 1, lat: 1, alt: 0, grounded: false },
        { lng: 2, lat: 2, alt: 10_000, grounded: true },
        { lng: 3, lat: 3, alt: 5_000 },
      ],
      opts,
    );
    expect(feats).toHaveLength(1);
    expect(feats[0].properties?.height).toBeGreaterThan(0);
  });
});

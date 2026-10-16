import { describe, expect, it } from 'vitest';
import {
  groundTrackBearing,
  issFollowFromPositions,
  issFollowZoomForFrame,
  ISS_FOLLOW_DEFAULT_ZOOM,
  ISS_FOLLOW_PITCH,
  ISS_NORAD_ID,
} from './iss-follow';

describe('groundTrackBearing', () => {
  it('is ~0° for due north', () => {
    expect(groundTrackBearing({ lat: 40, lng: -70 }, { lat: 41, lng: -70 })).toBeCloseTo(0, 0);
  });

  it('is ~90° for due east at equator', () => {
    expect(groundTrackBearing({ lat: 0, lng: 0 }, { lat: 0, lng: 1 })).toBeCloseTo(90, 0);
  });
});

describe('issFollowFromPositions', () => {
  it('carries altitude and ground-track bearing', () => {
    const t = issFollowFromPositions(
      { lat: 40, lng: -70, altKm: 408 },
      { lat: 40.1, lng: -69.9 },
    );
    expect(t.altKm).toBe(408);
    expect(t.bearing).toBeGreaterThan(0);
    expect(t.bearing).toBeLessThan(90);
  });
});

describe('constants', () => {
  it('targets the ISS NORAD id and a steep pitch', () => {
    expect(ISS_NORAD_ID).toBe('25544');
    expect(ISS_FOLLOW_PITCH).toBeGreaterThanOrEqual(60);
  });
});

describe('issFollowZoomForFrame', () => {
  it('frames ~ISS altitude at video-like regional zoom', () => {
    const z = issFollowZoomForFrame(408);
    expect(z).toBeGreaterThanOrEqual(7.2);
    expect(z).toBeLessThanOrEqual(9.2);
    expect(ISS_FOLLOW_DEFAULT_ZOOM).toBe(z);
  });

  it('zooms in when the camera is lower', () => {
    expect(issFollowZoomForFrame(200)).toBeGreaterThan(issFollowZoomForFrame(500));
  });
});

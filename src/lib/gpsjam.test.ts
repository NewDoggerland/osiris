import { describe, it, expect } from 'vitest';
import {
  gpsJamPercentBad,
  gpsJamLevel,
  parseGpsJamCsv,
  parseGpsJamManifest,
  latestManifestDate,
} from './gpsjam';

describe('gpsJamPercentBad', () => {
  it('uses (bad-1)/(good+bad)*100', () => {
    expect(gpsJamPercentBad(90, 11)).toBeCloseTo((100 * 10) / 101, 5);
  });
  it('clamps when bad is 0 or 1', () => {
    expect(gpsJamPercentBad(10, 0)).toBe(0);
    expect(gpsJamPercentBad(10, 1)).toBe(0);
  });
});

describe('gpsJamLevel', () => {
  it('classifies medium and high', () => {
    expect(gpsJamLevel(1.5)).toBeNull();
    expect(gpsJamLevel(2)).toBe('medium');
    expect(gpsJamLevel(10)).toBe('medium');
    expect(gpsJamLevel(10.1)).toBe('high');
  });
});

describe('parseGpsJamCsv', () => {
  it('keeps medium/high and drops low-sample', () => {
    const csv = [
      'hex,count_good_aircraft,count_bad_aircraft',
      '8928308280fffff,100,1',
      '89283082807ffff,80,20',
      '89283082803ffff,1,1',
    ].join('\n');
    const rows = parseGpsJamCsv(csv);
    expect(rows.every((r) => r.level === 'medium' || r.level === 'high')).toBe(true);
    expect(rows.some((r) => r.h3 === '89283082807ffff')).toBe(true);
    expect(rows.some((r) => r.h3 === '8928308280fffff')).toBe(false);
  });
});

describe('manifest', () => {
  it('parses dates and returns latest', () => {
    const m = parseGpsJamManifest(
      'date,suspect,num_bad_aircraft_hexes,source\n2026-10-14,false,1,x\n2026-10-15,false,2,x\n',
    );
    expect(m).toEqual(['2026-10-14', '2026-10-15']);
    expect(latestManifestDate(m)).toBe('2026-10-15');
  });
});

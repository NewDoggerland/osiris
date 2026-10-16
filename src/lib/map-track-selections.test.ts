import { describe, expect, it } from 'vitest';
import {
  SHIP_TRACK_CAP,
  clearAllTracks,
  dockRows,
  emptyTrackSelection,
  removeTrack,
  setShipTrackResult,
  setShipTrailDays,
  setTransitTrack,
  toggleShipTrack,
} from './map-track-selections';

describe('map-track-selections', () => {
  it('toggles ship on then off', () => {
    let s = emptyTrackSelection();
    s = toggleShipTrack(s, { mmsi: '273610820', label: 'NORD' });
    expect(s.ships).toHaveLength(1);
    expect(s.ships[0]!.status).toBe('loading');
    expect(s.ships[0]!.trailDays).toBe(1);
    s = toggleShipTrack(s, { mmsi: '273610820', label: 'NORD' });
    expect(s.ships).toHaveLength(0);
  });

  it('setShipTrailDays updates length and reloads', () => {
    let s = toggleShipTrack(emptyTrackSelection(), { mmsi: '1', label: 'A' });
    s = setShipTrackResult(s, '1', {
      ok: true,
      coordinates: [
        [0, 0],
        [1, 1],
      ],
    });
    s = setShipTrailDays(s, '1', 7);
    expect(s.ships[0]!.trailDays).toBe(7);
    expect(s.ships[0]!.status).toBe('loading');
  });

  it('FIFO drops oldest when exceeding SHIP_TRACK_CAP', () => {
    let s = emptyTrackSelection();
    for (let i = 0; i < SHIP_TRACK_CAP + 1; i++) {
      s = toggleShipTrack(s, { mmsi: String(100000000 + i), label: `S${i}` });
    }
    expect(s.ships).toHaveLength(SHIP_TRACK_CAP);
    expect(s.ships[0]!.id).toBe('100000001');
    expect(s.ships.at(-1)?.id).toBe(String(100000000 + SHIP_TRACK_CAP));
  });

  it('setShipTrackResult fills coordinates or marks error', () => {
    let s = toggleShipTrack(emptyTrackSelection(), { mmsi: '1', label: 'A' });
    s = setShipTrackResult(s, '1', {
      ok: true,
      coordinates: [
        [0, 0],
        [1, 1],
      ],
      meta: { points: 2 },
    });
    expect(s.ships[0]!.status).toBe('ready');
    expect(s.ships[0]!.coordinates).toHaveLength(2);
  });

  it('clearAllTracks and removeTrack clear dock rows', () => {
    let s = toggleShipTrack(emptyTrackSelection(), { mmsi: '1', label: 'A' });
    s = setTransitTrack(s, {
      kind: 'transit',
      id: 'mbta:t1',
      label: 'Red',
      status: 'ready',
    });
    expect(dockRows(s).length).toBe(2);
    s = removeTrack(s, 'ship', '1');
    expect(dockRows(s).map((r) => r.kind)).toEqual(['transit']);
    s = clearAllTracks(s);
    expect(dockRows(s)).toEqual([]);
  });
});

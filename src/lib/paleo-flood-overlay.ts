/**
 * Viewport DEM flood overlay — Terrarium tiles → translucent water where elev ≤ level.
 *
 * Drawn in screen space from mercator tile corners via map.project. Globe projection
 * warps those quads into misaligned strips, so drawing is skipped while projection
 * is globe (OsirisMap switches to mercator when meters flood is on).
 */

import type { Map as MlMap } from 'maplibre-gl';
import { decodeTerrariumRgba, paintFloodMask, TERRARIUM_ATTRIBUTION } from './terrarium-decode';
import { clampSeaLevelMeters } from './paleo-sea-level';

export { TERRARIUM_ATTRIBUTION };

const TERRARIUM = 'https://s3.amazonaws.com/elevation-tiles-prod/terrarium';
const MAX_Z = 7;
const MAX_TILES = 24;

export type PaleoFloodOverlay = {
  setLevel: (m: number) => void;
  setEnabled: (on: boolean) => void;
  destroy: () => void;
};

function lngLatToTile(lng: number, lat: number, z: number): { x: number; y: number } {
  const n = 2 ** z;
  const x = Math.floor(((lng + 180) / 360) * n);
  const latRad = (lat * Math.PI) / 180;
  const y = Math.floor(((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n);
  return { x: ((x % n) + n) % n, y: Math.min(n - 1, Math.max(0, y)) };
}

function tileBounds(z: number, x: number, y: number): { west: number; south: number; east: number; north: number } {
  const n = 2 ** z;
  const west = (x / n) * 360 - 180;
  const east = ((x + 1) / n) * 360 - 180;
  const nLat = (yy: number) => {
    const t = Math.PI * (1 - (2 * yy) / n);
    return (180 / Math.PI) * Math.atan(0.5 * (Math.exp(t) - Math.exp(-t)));
  };
  return { west, east, north: nLat(y), south: nLat(y + 1) };
}

function isGlobeProjection(map: MlMap): boolean {
  try {
    const t = map.getProjection()?.type;
    if (t === 'globe' || t === 'vertical-perspective') return true;
    if (Array.isArray(t)) return true; // adaptive globe expression
  } catch {
    /* older maplibre */
  }
  return false;
}

type TileCache = { key: string; elev: Float32Array; mask: HTMLCanvasElement; level: number };

export function createPaleoFloodOverlay(map: MlMap): PaleoFloodOverlay {
  const canvas = document.createElement('canvas');
  canvas.style.cssText =
    'position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:3;';
  // Canvas container tracks the map surface (correct origin for map.project).
  const parent = map.getCanvasContainer();
  if (getComputedStyle(parent).position === 'static') parent.style.position = 'relative';
  parent.appendChild(canvas);
  const ctx = canvas.getContext('2d')!;

  let enabled = false;
  let level = 0;
  let debounce: ReturnType<typeof setTimeout> | undefined;
  let raf = 0;
  let inflight = 0;
  let gen = 0;
  const cache = new Map<string, TileCache>();

  const resize = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = parent.clientWidth;
    const h = parent.clientHeight;
    canvas.width = Math.max(1, Math.floor(w * dpr));
    canvas.height = Math.max(1, Math.floor(h * dpr));
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };

  const loadTile = async (z: number, x: number, y: number): Promise<TileCache | null> => {
    const key = `${z}/${x}/${y}`;
    const hit = cache.get(key);
    if (hit && hit.level === level) return hit;

    const res = await fetch(`${TERRARIUM}/${z}/${x}/${y}.png`, {
      cache: 'force-cache',
      credentials: 'omit',
    });
    if (!res.ok) return null;
    const blob = await res.blob();
    const bmp = await createImageBitmap(blob);
    const off = document.createElement('canvas');
    off.width = 256;
    off.height = 256;
    const octx = off.getContext('2d')!;
    octx.drawImage(bmp, 0, 0);
    bmp.close();
    const img = octx.getImageData(0, 0, 256, 256);
    const elev = decodeTerrariumRgba(img.data, 256, 256);
    const mask = document.createElement('canvas');
    mask.width = 256;
    mask.height = 256;
    const mctx = mask.getContext('2d')!;
    const maskData = mctx.createImageData(256, 256);
    paintFloodMask(elev, level, maskData.data);
    mctx.putImageData(maskData, 0, 0);
    const entry: TileCache = { key, elev, mask, level };
    cache.set(key, entry);
    if (cache.size > 48) {
      const first = cache.keys().next().value;
      if (first) cache.delete(first);
    }
    return entry;
  };

  const redraw = async () => {
    const w = parent.clientWidth;
    const h = parent.clientHeight;
    if (!enabled || document.hidden) {
      ctx.clearRect(0, 0, w, h);
      return;
    }
    // Axis-aligned tile blit is only valid in mercator screen space.
    if (isGlobeProjection(map)) {
      resize();
      ctx.clearRect(0, 0, w, h);
      return;
    }

    const my = ++gen;
    resize();
    ctx.clearRect(0, 0, w, h);

    const z = Math.min(MAX_Z, Math.max(0, Math.floor(map.getZoom())));
    const b = map.getBounds();
    const sw = lngLatToTile(b.getWest(), b.getSouth(), z);
    const ne = lngLatToTile(b.getEast(), b.getNorth(), z);
    const x0 = Math.min(sw.x, ne.x);
    const x1 = Math.max(sw.x, ne.x);
    const y0 = Math.min(sw.y, ne.y);
    const y1 = Math.max(sw.y, ne.y);

    const tiles: { z: number; x: number; y: number }[] = [];
    for (let x = x0; x <= x1; x++) {
      for (let y = y0; y <= y1; y++) {
        tiles.push({ z, x, y });
        if (tiles.length >= MAX_TILES) break;
      }
      if (tiles.length >= MAX_TILES) break;
    }

    inflight++;
    try {
      const loaded = await Promise.all(
        tiles.map(async (t) => {
          try {
            const tile = await loadTile(t.z, t.x, t.y);
            return tile ? { ...t, tile } : null;
          } catch {
            return null;
          }
        }),
      );
      if (my !== gen || !enabled) return;

      for (const item of loaded) {
        if (!item) continue;
        if (item.tile.level !== level) {
          const mctx = item.tile.mask.getContext('2d')!;
          const maskData = mctx.createImageData(256, 256);
          paintFloodMask(item.tile.elev, level, maskData.data);
          mctx.putImageData(maskData, 0, 0);
          item.tile.level = level;
        }
        const bb = tileBounds(item.z, item.x, item.y);
        const tl = map.project([bb.west, bb.north]);
        const br = map.project([bb.east, bb.south]);
        const dw = br.x - tl.x;
        const dh = br.y - tl.y;
        if (!Number.isFinite(dw) || !Number.isFinite(dh) || !Number.isFinite(tl.x) || !Number.isFinite(tl.y)) {
          continue;
        }
        // Reject pathological stretches (common when a tile sits near the globe limb).
        if (dw <= 1 || dh <= 1) continue;
        if (dw > w * 1.5 || dh > h * 1.5) continue;
        if (dw / dh > 8 || dh / dw > 8) continue;
        ctx.drawImage(item.tile.mask, tl.x, tl.y, dw, dh);
      }
    } finally {
      inflight--;
    }
  };

  const schedule = () => {
    clearTimeout(debounce);
    debounce = setTimeout(() => {
      void redraw();
    }, 80);
  };

  const scheduleRaf = () => {
    if (raf) return;
    raf = requestAnimationFrame(() => {
      raf = 0;
      schedule();
    });
  };

  const onMove = () => scheduleRaf();
  const onVis = () => {
    if (!document.hidden) schedule();
  };

  map.on('move', onMove);
  map.on('moveend', onMove);
  map.on('zoomend', onMove);
  map.on('resize', onMove);
  document.addEventListener('visibilitychange', onVis);
  resize();

  return {
    setLevel(m: number) {
      level = clampSeaLevelMeters(m);
      for (const t of cache.values()) t.level = Number.NaN;
      schedule();
    },
    setEnabled(on: boolean) {
      enabled = on;
      canvas.style.display = on ? 'block' : 'none';
      if (on) schedule();
      else {
        ctx.clearRect(0, 0, parent.clientWidth, parent.clientHeight);
      }
    },
    destroy() {
      clearTimeout(debounce);
      if (raf) cancelAnimationFrame(raf);
      gen++;
      map.off('move', onMove);
      map.off('moveend', onMove);
      map.off('zoomend', onMove);
      map.off('resize', onMove);
      document.removeEventListener('visibilitychange', onVis);
      canvas.remove();
      cache.clear();
      void inflight;
    },
  };
}

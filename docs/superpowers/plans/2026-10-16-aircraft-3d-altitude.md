# Aircraft 3D Altitude — Implementation Plan

> **For agentic workers:** Spec `docs/superpowers/specs/2026-10-16-aircraft-3d-altitude-design.md`. Execute task-by-task.

**Goal:** Show airborne aircraft at display height with ground→icon stems when pitch/zoom make height readable.

**Architecture:** Pure elevation helpers + GeoJSON fill-extrusion stems; elevated icons via a thin custom layer using MapLibre `projectTileFor3D` (atmospheric band only — not satellite altitude maths). Flat `fl-*` symbols remain for hit-testing when custom layer is off / as fallback.

**Tech Stack:** MapLibre 6.7, existing `flightsToGeoJsonFeatures`, vitest.

## File map

- `src/lib/flight-altitude.ts` (+ test) — elevation / stem visibility / stem polygons
- `src/lib/flight-altitude-layer.ts` — custom layer: stems + elevated billboards
- `src/components/OsirisMap.tsx` — source `flight-stems`, wire layer, feed custom layer from flight sync
- `src/lib/flights-geojson.ts` — pass through `grounded` if present

## Tasks

### Task 1: Helpers + tests — DONE

### Task 2: Stem source + fill-extrusion in OsirisMap

### Task 3: Custom elevated icon layer + hide flat when pitched stems on

### Task 4: Borders plan/impl after altitude green

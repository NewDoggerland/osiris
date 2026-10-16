import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { NextResponse } from 'next/server';
import { propagateTLE } from '@/lib/orbit';
import {
  issFollowFromPositions,
  ISS_FOLLOW_LEAD_MS,
  ISS_NORAD_ID,
} from '@/lib/iss-follow';

export const dynamic = 'force-dynamic';

const CACHE_FILE = join(process.cwd(), '.next', 'cache', 'satellites-tle-cache.json');

/** Stale but usable if the catalogue has not been warmed yet. */
const FALLBACK_TLE = {
  line1: '1 25544U 98067A   24146.40251785  .00015505  00000-0  27885-3 0  9997',
  line2: '2 25544  51.6402 189.7042 0004381 334.8091 106.8778 15.50091157455243',
};

function issTle(): { line1: string; line2: string; name: string } {
  try {
    if (existsSync(CACHE_FILE)) {
      const parsed = JSON.parse(readFileSync(CACHE_FILE, 'utf8')) as {
        sats?: { name?: string; line1?: string; line2?: string }[];
      };
      for (const sat of parsed.sats ?? []) {
        const norad = sat.line1?.substring(2, 7).trim();
        if (norad === ISS_NORAD_ID && sat.line1 && sat.line2) {
          return { line1: sat.line1, line2: sat.line2, name: sat.name || 'ISS' };
        }
      }
    }
  } catch {
    /* fallback */
  }
  return { ...FALLBACK_TLE, name: 'ISS' };
}

/** Live ISS lat/lng/bearing for SpaceCam MAP SYNC (led by one poll interval). */
export async function GET() {
  const tle = issTle();
  const now = new Date();
  // Ease toward where the station will be when this camera move finishes.
  const leadAt = new Date(now.getTime() + ISS_FOLLOW_LEAD_MS);
  const bearingAt = new Date(leadAt.getTime() + 20_000);
  const lead = propagateTLE(tle.line1, tle.line2, leadAt);
  const further = propagateTLE(tle.line1, tle.line2, bearingAt);
  if (!lead || !further) {
    return NextResponse.json({ error: 'propagate failed' }, { status: 422 });
  }
  const target = issFollowFromPositions(lead, further);
  return NextResponse.json(
    {
      noradId: ISS_NORAD_ID,
      name: tle.name,
      ...target,
      at: now.toISOString(),
      leadMs: ISS_FOLLOW_LEAD_MS,
    },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}

'use client';

import { useEffect, useState } from 'react';
import { Sparkles } from 'lucide-react';
import { BoxShell, Choice } from '@/components/TimeBox';
import {
  LEYLINES_ATTRIBUTION,
  LEYLINES_WATKINS_ATTRIBUTION,
} from '@/lib/leylines-catalog';
import {
  LEYLINES_COLOR_PRESETS,
  type LeylinesColorId,
} from '@/lib/leylines-colors';
import {
  parseLeylinesMode,
  type LeylinesMode,
} from '@/lib/leylines-mode';

const STORE_OPEN = 'osiris.leylines.open';
const STORE_MODE = 'osiris.leylines.mode';

type Props = {
  mode: LeylinesMode;
  color: LeylinesColorId;
  controls: boolean;
  loading?: boolean;
  onMode: (m: LeylinesMode) => void;
  onColor: (c: LeylinesColorId) => void;
  onOff?: () => void;
};

export default function LeylinesBar({
  mode,
  color,
  controls,
  loading,
  onMode,
  onColor,
  onOff,
}: Props) {
  const [open, setOpen] = useState(() => {
    try {
      return localStorage.getItem(STORE_OPEN) !== '0';
    } catch {
      return true;
    }
  });
  const [tuning, setTuning] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem(STORE_OPEN, open ? '1' : '0');
    } catch {
      /* ignore */
    }
  }, [open]);

  useEffect(() => {
    try {
      localStorage.setItem(STORE_MODE, mode);
    } catch {
      /* ignore */
    }
  }, [mode]);

  if (!controls) return null;

  const chip =
    mode === 'watkins' ? 'WATKINS' : mode === 'grid' ? 'GRID' : 'BOTH';
  const attr =
    mode === 'grid' ? LEYLINES_ATTRIBUTION : LEYLINES_WATKINS_ATTRIBUTION;

  return (
    <BoxShell
      icon={Sparkles}
      title="Leylines"
      source="LEYLINES"
      open={open}
      playing={false}
      tuning={tuning}
      tuneLabel="About"
      onOpen={() => setOpen(true)}
      onFold={() => {
        setTuning(false);
        setOpen(false);
      }}
      onTune={() => setTuning((o) => !o)}
      onOff={onOff}
      chip={
        <>
          <span className="text-[10.5px] font-semibold tracking-wider text-[var(--gold-light)] tabular-nums">
            {chip}
          </span>
          {loading && (
            <span className="text-[9px] tracking-wider text-white/35 animate-pulse">…</span>
          )}
        </>
      }
      tune={
        <p className="text-[9px] tracking-[0.12em] text-white/40 leading-relaxed">
          Watkins alignments and Gravity Wells grid via Leylines Map (maps.leylines.net).
          Attribute: {attr}.
        </p>
      }
    >
      <div className="min-h-[34px]">
        <div className="text-[13px] leading-tight font-semibold tracking-wider text-[var(--gold-light)]">
          {chip}
        </div>
        <div className="mt-0.5 text-[9px] tracking-[0.14em] text-white/45">
          MODE{loading ? ' · LOADING' : ''}
        </div>
      </div>

      <div className="mt-2">
        <Choice
          label="Mode"
          value={mode}
          options={[
            { value: 'watkins', label: 'WATKINS' },
            { value: 'grid', label: 'GRID' },
            { value: 'both', label: 'BOTH' },
          ]}
          onChange={(v) => onMode(parseLeylinesMode(v))}
        />
      </div>

      <div className="mt-2">
        <div className="text-[8px] tracking-[0.14em] text-white/45 mb-1.5">COLOR</div>
        <div className="flex items-center gap-1.5 flex-wrap">
          {LEYLINES_COLOR_PRESETS.map((p) => {
            const on = color === p.id;
            return (
              <button
                key={p.id}
                type="button"
                title={p.label}
                aria-label={`Leyline color ${p.label}`}
                aria-pressed={on}
                onClick={() => onColor(p.id)}
                className="w-5 h-5 rounded-full border transition-transform focus:outline-none focus-visible:ring-1 focus-visible:ring-white/50"
                style={{
                  background: p.hex,
                  borderColor: on ? '#fff' : 'rgba(255,255,255,0.25)',
                  boxShadow: on ? `0 0 0 1px ${p.hex}` : undefined,
                  transform: on ? 'scale(1.12)' : undefined,
                }}
              />
            );
          })}
        </div>
      </div>

      <p className="mt-2 text-[8px] tracking-[0.1em] text-white/35 leading-snug">
        {attr}
      </p>
    </BoxShell>
  );
}

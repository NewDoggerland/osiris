export type LeylinesColorId = 'gold' | 'cyan' | 'white' | 'red' | 'green';

export type LeylinesColorPreset = {
  id: LeylinesColorId;
  label: string;
  /** Watkins / primary line stroke */
  hex: string;
};

export const LEYLINES_COLOR_PRESETS: LeylinesColorPreset[] = [
  { id: 'gold', label: 'Gold', hex: '#E8C547' },
  { id: 'cyan', label: 'Cyan', hex: '#5C9EAD' },
  { id: 'white', label: 'White', hex: '#E8E6E0' },
  { id: 'red', label: 'Red', hex: '#E57373' },
  { id: 'green', label: 'Green', hex: '#66BB6A' },
];

export const LEYLINES_COLOR_DEFAULT: LeylinesColorId = 'gold';

export function parseLeylinesColor(raw: string | null | undefined): LeylinesColorId {
  if (raw === 'gold' || raw === 'cyan' || raw === 'white' || raw === 'red' || raw === 'green') {
    return raw;
  }
  return LEYLINES_COLOR_DEFAULT;
}

export function leylinesColorHex(id: LeylinesColorId): string {
  return LEYLINES_COLOR_PRESETS.find((p) => p.id === id)?.hex ?? '#E8C547';
}

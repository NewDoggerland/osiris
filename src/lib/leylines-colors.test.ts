import { describe, expect, it } from 'vitest';
import {
  LEYLINES_COLOR_PRESETS,
  leylinesColorHex,
  parseLeylinesColor,
} from './leylines-colors';

describe('leylines-colors', () => {
  it('exposes five presets', () => {
    expect(LEYLINES_COLOR_PRESETS.map((p) => p.id)).toEqual([
      'gold',
      'cyan',
      'white',
      'red',
      'green',
    ]);
  });

  it('parses ids and defaults unknown to gold', () => {
    expect(parseLeylinesColor('cyan')).toBe('cyan');
    expect(parseLeylinesColor(null)).toBe('gold');
    expect(parseLeylinesColor('nope')).toBe('gold');
  });

  it('resolves hex', () => {
    expect(leylinesColorHex('gold')).toBe('#E8C547');
    expect(leylinesColorHex('red')).toMatch(/^#/);
  });
});

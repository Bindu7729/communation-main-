import { describe, it, expect } from 'vitest';
import { extractNormalizedWaveform } from '../../src/lib/audioWaveform';

describe('Audio Waveform Extraction Utility', () => {
  it('extracts normalized waveform bars scaled between 0 and 1', () => {
    const raw = [0.1, 0.5, 0.8, 0.4, 0.2, 0.9, 0.3, 0.1];
    const result = extractNormalizedWaveform(raw, 4);

    expect(result.samples).toHaveLength(4);
    expect(result.peakAmplitude).toBeGreaterThan(0);
    expect(result.samples.every(s => s >= 0 && s <= 1.0)).toBe(true);
  });

  it('handles empty audio streams with zero-filled array', () => {
    const result = extractNormalizedWaveform([], 16);

    expect(result.samples).toHaveLength(16);
    expect(result.samples.every(s => s === 0)).toBe(true);
    expect(result.peakAmplitude).toBe(0);
  });
});

export interface WaveformData {
  samples: number[];
  durationMs: number;
  peakAmplitude: number;
}

export function extractNormalizedWaveform(rawSamples: number[], targetBars: number = 32): WaveformData {
  if (!rawSamples || rawSamples.length === 0) {
    return {
      samples: new Array(targetBars).fill(0),
      durationMs: 0,
      peakAmplitude: 0
    };
  }

  const blockSize = Math.max(1, Math.floor(rawSamples.length / targetBars));
  const normalized: number[] = [];
  let peakAmplitude = 0;

  for (let i = 0; i < targetBars; i++) {
    const start = i * blockSize;
    const slice = rawSamples.slice(start, start + blockSize);
    if (slice.length === 0) {
      normalized.push(0);
      continue;
    }

    // Calculate RMS energy of this block
    const sumSquares = slice.reduce((sum, val) => sum + (val * val), 0);
    const rms = Math.sqrt(sumSquares / slice.length);
    if (rms > peakAmplitude) peakAmplitude = rms;
    normalized.push(rms);
  }

  // Scale relative to peak amplitude (0.0 to 1.0)
  const scaled = peakAmplitude > 0
    ? normalized.map(val => Math.round((val / peakAmplitude) * 100) / 100)
    : normalized;

  return {
    samples: scaled,
    durationMs: rawSamples.length * 20, // Approx 20ms per sample
    peakAmplitude: Math.round(peakAmplitude * 100) / 100
  };
}

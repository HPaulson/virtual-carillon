export interface AudioMetrics {
  durationSeconds: number;
  peak: number;
  rms: number;
  dcOffsetLeft: number;
  dcOffsetRight: number;
  clippedSamples: number;
  tailRms: number;
  tailToBodyRatio: number;
  spectralCentroidHz: number;
  highBandTailRatio: number;
}

/** Lightweight PCM diagnostics used by tests and the CLI, not a mastering tool. */
export function analyzeAudio(samples: Float32Array, sampleRate: number): AudioMetrics {
  const frames = Math.floor(samples.length / 2);
  if (!frames) throw new Error('Cannot analyze empty audio');
  let peak = 0;
  let sumSquares = 0;
  let leftSum = 0;
  let rightSum = 0;
  let clippedSamples = 0;
  for (let frame = 0; frame < frames; frame++) {
    const left = samples[frame * 2];
    const right = samples[frame * 2 + 1];
    peak = Math.max(peak, Math.abs(left), Math.abs(right));
    sumSquares += (left * left + right * right) / 2;
    leftSum += left;
    rightSum += right;
    if (Math.abs(left) >= 0.999 || Math.abs(right) >= 0.999) clippedSamples++;
  }
  const tailFrames = Math.min(frames, Math.floor(sampleRate * 0.75));
  const bodyStart = Math.max(0, Math.floor(frames * 0.2));
  const bodyEnd = Math.max(bodyStart + 1, frames - tailFrames);
  const tailRms = rms(samples, frames - tailFrames, frames);
  const bodyRms = rms(samples, bodyStart, bodyEnd);
  const centroid = spectralCentroid(samples, sampleRate);
  return {
    durationSeconds: frames / sampleRate,
    peak,
    rms: Math.sqrt(sumSquares / frames),
    dcOffsetLeft: leftSum / frames,
    dcOffsetRight: rightSum / frames,
    clippedSamples,
    tailRms,
    tailToBodyRatio: bodyRms ? tailRms / bodyRms : 0,
    spectralCentroidHz: centroid,
    highBandTailRatio: highBandRatio(samples, sampleRate, tailFrames),
  };
}

function rms(samples: Float32Array, startFrame: number, endFrame: number): number {
  let sum = 0;
  const count = Math.max(1, endFrame - startFrame);
  for (let frame = startFrame; frame < endFrame; frame++)
    sum += (samples[frame * 2] ** 2 + samples[frame * 2 + 1] ** 2) / 2;
  return Math.sqrt(sum / count);
}

function spectralCentroid(samples: Float32Array, sampleRate: number): number {
  const frameCount = Math.min(Math.floor(samples.length / 2), 4096);
  const bins = Math.min(512, Math.floor(frameCount / 2));
  let weighted = 0;
  let total = 0;
  for (let bin = 1; bin < bins; bin++) {
    const frequency = (bin * sampleRate) / (bins * 2);
    let real = 0;
    let imaginary = 0;
    for (let frame = 0; frame < frameCount; frame += Math.max(1, Math.floor(frameCount / 1024))) {
      const phase = (2 * Math.PI * bin * frame) / frameCount;
      const sample = (samples[frame * 2] + samples[frame * 2 + 1]) / 2;
      real += sample * Math.cos(phase);
      imaginary -= sample * Math.sin(phase);
    }
    const magnitude = Math.hypot(real, imaginary);
    weighted += frequency * magnitude;
    total += magnitude;
  }
  return total ? weighted / total : 0;
}

function highBandRatio(samples: Float32Array, sampleRate: number, tailFrames: number): number {
  const start = Math.max(0, Math.floor(samples.length / 2) - tailFrames);
  let high = 0;
  let all = 0;
  const threshold = sampleRate * 0.18;
  let previous = 0;
  for (let frame = start; frame < samples.length / 2; frame++) {
    const sample = (samples[frame * 2] + samples[frame * 2 + 1]) / 2;
    const difference = sample - previous;
    high += difference * difference;
    all += sample * sample;
    previous = sample;
  }
  return all ? Math.min(1, (high / all) * (threshold / sampleRate)) : 0;
}

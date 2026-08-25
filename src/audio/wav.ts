import fs from 'node:fs/promises';
import path from 'node:path';

export async function writeWav(
  filePath: string,
  samples: Float32Array,
  sampleRate = 44100,
): Promise<void> {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  const channels = 2;
  const bitsPerSample = 16;
  const dataSize = samples.length * 2;
  const buffer = Buffer.alloc(44 + dataSize);
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(channels, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE((sampleRate * channels * bitsPerSample) / 8, 28);
  buffer.writeUInt16LE((channels * bitsPerSample) / 8, 32);
  buffer.writeUInt16LE(bitsPerSample, 34);
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);
  for (let i = 0; i < samples.length; i++)
    buffer.writeInt16LE(Math.round(Math.max(-1, Math.min(1, samples[i])) * 32767), 44 + i * 2);
  await fs.writeFile(filePath, buffer);
}

export function wavDuration(samples: Float32Array, sampleRate: number): number {
  return samples.length / 2 / sampleRate;
}

export async function wavDurationFromFile(filePath: string): Promise<number> {
  const handle = await fs.open(filePath, 'r');
  try {
    const header = Buffer.alloc(44);
    const { bytesRead } = await handle.read(header, 0, header.length, 0);
    if (
      bytesRead < 44 ||
      header.toString('ascii', 0, 4) !== 'RIFF' ||
      header.toString('ascii', 8, 12) !== 'WAVE'
    ) {
      throw new Error(`Unsupported WAV file: ${filePath}`);
    }
    const channels = header.readUInt16LE(22);
    const sampleRate = header.readUInt32LE(24);
    const bitsPerSample = header.readUInt16LE(34);
    const dataSize = header.readUInt32LE(40);
    if (!channels || !sampleRate || !bitsPerSample || bitsPerSample % 8 !== 0) {
      throw new Error(`Invalid WAV format: ${filePath}`);
    }
    return dataSize / (sampleRate * channels * (bitsPerSample / 8));
  } finally {
    await handle.close();
  }
}

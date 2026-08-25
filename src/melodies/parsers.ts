import { Melody, Note, Score, ScoreNote, scoreFromMelody } from './types.js';

export function parseAbc(source: string, id = 'abc-melody'): Melody {
  const title = source.match(/^T:\s*(.+)$/m)?.[1]?.trim() ?? id;
  const bpm = Number(source.match(/^Q:\s*(?:\d+\/\d+=)?(\d+(?:\.\d+)?)/m)?.[1] ?? 100);
  const meter = parseAbcMeter(source.match(/^M:\s*(.+)$/m)?.[1]?.trim());
  const defaultLength = parseFraction(source.match(/^L:\s*(\d+\/\d+)$/m)?.[1] ?? '1/4');
  const key = source.match(/^K:\s*([A-Ga-g][#b]?)(?:m|min|minor)?/m)?.[1] ?? 'C';
  const minor = /^K:\s*[A-Ga-g][#b]?(?:m|min|minor)/m.test(source);
  const keyAccidentals = abcKeyAccidentals(key, minor);
  const notes: Note[] = [];
  const body = expandAbcRepeats(
    source
      .split(/\n/)
      .filter((line) => !/^[A-Z]:/.test(line) && !/^\s*%/.test(line))
      .join(' '),
  )
    .replace(/"[^"]*"/g, '')
    .replace(/\{[^}]*\}/g, '');
  const tokenPattern =
    /\[[^\]]*\](?:\d+)?(?:\/\d*)?|(?:\^{1,2}|_{1,2}|=)?[A-Ga-gz][,']*(?:\d+)?(?:\/\d*)?(?:-)?/g;
  let cursor = 0;
  let pendingTie = false;
  for (const token of body.match(tokenPattern) ?? []) {
    const chordMatch = token.match(/^\[([^\]]+)\]((?:\d+)?(?:\/\d*)?)$/);
    const bareToken = token.replace(/-$/, '');
    const lengthPart = (chordMatch?.[2] || bareToken).match(/(?:\d+\/\d*|\d+|\/\d*)$/)?.[0] ?? '';
    const duration = abcDuration(lengthPart) * defaultLength * 4;
    if (chordMatch) {
      const chordTokens = chordMatch[1].match(/(?:\^{1,2}|_{1,2}|=)?[A-Ga-g][,']*/g) ?? [];
      const chordVoice = `chord-${cursor}`;
      for (const chordToken of chordTokens)
        notes.push({
          ...parseAbcPitch(chordToken, keyAccidentals),
          duration,
          beat: cursor,
          voice: chordVoice,
        });
      cursor += duration;
      continue;
    }
    const wasTied = token.endsWith('-');
    const parsed =
      bareToken[0].toLowerCase() === 'z'
        ? { pitch: 'rest' as const }
        : parseAbcPitch(bareToken, keyAccidentals);
    const tie = wasTied ? (pendingTie ? 'continue' : 'start') : pendingTie ? 'stop' : undefined;
    if (wasTied) pendingTie = true;
    else pendingTie = false;
    notes.push({ ...parsed, duration, beat: cursor, ...(tie ? { tie } : {}) });
    cursor += duration;
  }
  const melody: Melody = {
    id,
    name: title,
    bpm,
    notes,
    notationFormat: 'abc',
    notation: source,
    meter,
  };
  return { ...melody, score: scoreFromMelody(melody) };
}

function parseAbcPitch(token: string, keyAccidentals: Record<string, string>): Note {
  const accidental = token.startsWith('^') ? '#' : token.startsWith('_') ? 'b' : '';
  const noteToken = token.replace(/^[\^_=]+/, '');
  const letter = noteToken[0];
  const octaveMarks = noteToken.match(/[,']+/)?.[0] ?? '';
  const octave =
    (letter === letter.toLowerCase() ? 5 : 4) +
    (octaveMarks.match(/'/g)?.length ?? 0) -
    (octaveMarks.match(/,/g)?.length ?? 0);
  const spelledAccidental =
    accidental || (token.startsWith('=') ? '' : (keyAccidentals[letter.toUpperCase()] ?? ''));
  return { pitch: `${letter.toUpperCase()}${spelledAccidental}${octave}`, duration: 0 };
}

export function parseMusicXml(source: string, id = 'musicxml-melody'): Melody {
  const title = textTag(source, 'movement-title') ?? textTag(source, 'work-title') ?? id;
  const divisions = Number(textTag(source, 'divisions') ?? 1);
  const bpm = Number(source.match(/<sound[^>]*tempo="([\d.]+)"/)?.[1] ?? 100);
  const notes: Note[] = [];
  let cursor = 0;
  for (const noteXml of source.match(/<note[\s\S]*?<\/note>/g) ?? []) {
    const duration = Number(textTag(noteXml, 'duration') ?? 1) / divisions;
    const rest = /<rest\s*\/?\s*>/.test(noteXml);
    if (rest)
      notes.push({
        pitch: 'rest',
        duration,
        beat: cursor,
        voice: textTag(noteXml, 'voice') ?? 'voice-1',
      });
    else {
      const step = textTag(noteXml, 'step');
      const octave = textTag(noteXml, 'octave');
      if (!step || !octave) continue;
      const alter = Number(textTag(noteXml, 'alter') ?? 0);
      const accidental = alter === 1 ? '#' : alter === -1 ? 'b' : '';
      notes.push({
        pitch: `${step}${accidental}${octave}`,
        duration,
        beat: cursor,
        voice: textTag(noteXml, 'voice') ?? 'voice-1',
        tie: /<tie[^>]*type="(start|stop)"/.exec(noteXml)?.[1] as Note['tie'],
      });
    }
    cursor += duration;
  }
  const melody: Melody = {
    id,
    name: title,
    bpm,
    notes,
    notationFormat: 'musicxml',
    notation: source,
    meter: {
      numerator: Number(textTag(source, 'beats') ?? 4),
      denominator: Number(textTag(source, 'beat-type') ?? 4),
    },
  };
  return { ...melody, score: scoreFromMelody(melody) };
}

export function parseMidi(data: Uint8Array, id = 'midi-melody'): Melody {
  const reader = new MidiReader(data);
  if (reader.ascii(0, 4) !== 'MThd') throw new Error('Invalid MIDI header');
  const tracks = reader.u16(10);
  const division = reader.u16(12);
  if (division & 0x8000) throw new Error('SMPTE MIDI timing is not supported');
  const active = new Map<number, { tick: number; velocity: number; voice: string }[]>();
  const notes: Note[] = [];
  let tempo = 500000;
  let cursor = 14;
  for (let track = 0; track < tracks; track++) {
    if (reader.ascii(cursor, 4) !== 'MTrk') throw new Error('Invalid MIDI track');
    const length = reader.u32(cursor + 4);
    let position = cursor + 8;
    const end = position + length;
    let tick = 0;
    let running = 0;
    while (position < end) {
      const delta = reader.vlq(position);
      tick += delta.value;
      position = delta.next;
      let status = reader.u8(position);
      if (status < 0x80) status = running;
      else {
        position++;
        running = status;
      }
      if (status === 0xff) {
        const meta = reader.u8(position++);
        const size = reader.vlq(position);
        position = size.next;
        if (meta === 0x51 && size.value === 3) tempo = reader.u24(position);
        position += size.value;
      } else if (status === 0xf0 || status === 0xf7) {
        const size = reader.vlq(position);
        position = size.next + size.value;
      } else {
        const type = status & 0xf0;
        const channelNote = ((status & 0x0f) << 8) | reader.u8(position);
        position++;
        if (type !== 0xc0 && type !== 0xd0) position++;
        if (type === 0x90 && reader.u8(position - 1) > 0) {
          const list = active.get(channelNote) ?? [];
          list.push({
            tick,
            velocity: reader.u8(position - 1) / 127,
            voice: `midi-track-${track + 1}`,
          });
          active.set(channelNote, list);
        } else if (type === 0x80 || (type === 0x90 && reader.u8(position - 1) === 0)) {
          const list = active.get(channelNote);
          const start = list?.shift();
          if (start)
            notes.push({
              pitch: midiPitch(channelNote & 0xff),
              duration: Math.max(0.125, (tick - start.tick) / division),
              beat: start.tick / division,
              velocity: Math.max(0.35, start.velocity),
              voice: start.voice,
            });
        }
      }
    }
    cursor = end;
  }
  notes.sort((a, b) => (a.beat ?? 0) - (b.beat ?? 0));
  const melody: Melody = {
    id,
    name: id,
    bpm: Math.round(60000000 / tempo),
    notes,
    notationFormat: 'midi',
    meter: { numerator: 4, denominator: 4 },
  };
  return { ...melody, score: scoreFromMelody(melody) };
}

class MidiReader {
  constructor(private readonly data: Uint8Array) {}
  u8(offset: number) {
    return this.data[offset] ?? 0;
  }
  u16(offset: number) {
    return (this.u8(offset) << 8) | this.u8(offset + 1);
  }
  u24(offset: number) {
    return (this.u8(offset) << 16) | (this.u8(offset + 1) << 8) | this.u8(offset + 2);
  }
  u32(offset: number) {
    return (
      this.u8(offset) * 0x1000000 +
      (this.u8(offset + 1) << 16) +
      (this.u8(offset + 2) << 8) +
      this.u8(offset + 3)
    );
  }
  ascii(offset: number, length: number) {
    return String.fromCharCode(...this.data.slice(offset, offset + length));
  }
  vlq(offset: number) {
    let value = 0;
    let next = offset;
    let byte = 0;
    do {
      byte = this.u8(next++);
      value = (value << 7) | (byte & 0x7f);
    } while (byte & 0x80);
    return { value, next };
  }
}

function textTag(xml: string, tag: string): string | undefined {
  return xml.match(new RegExp(`<${tag}[^>]*>([^<]+)</${tag}>`))?.[1]?.trim();
}
function abcDuration(value: string): number {
  if (!value) return 1;
  if (!value.includes('/')) return Number(value) || 1;
  if (value === '/') return 0.5;
  const [numerator, denominator] = value.split('/').map(Number);
  return (numerator || 1) / (denominator || 2);
}
function expandAbcRepeats(body: string): string {
  let expanded = body;
  let guard = 0;
  while (expanded.includes('|:') && expanded.includes(':|') && guard++ < 16) {
    const start = expanded.indexOf('|:');
    const end = expanded.indexOf(':|', start + 2);
    if (end < 0) break;
    const repeated = expanded.slice(start + 2, end);
    expanded = `${expanded.slice(0, start)}${repeated} ${repeated}${expanded.slice(end + 2)}`;
  }
  return expanded.replace(/:?\|\s*[1-9](?=\s|[|:\]])/g, '|');
}
function parseFraction(value: string): number {
  const [numerator, denominator] = value.split('/').map(Number);
  return (numerator || 1) / (denominator || 1);
}
function parseAbcMeter(value: string | undefined): { numerator: number; denominator: number } {
  if (!value || value === 'C' || value === 'C|') return { numerator: 4, denominator: 4 };
  const match = value.match(/(\d+)\s*\/\s*(\d+)/);
  return match
    ? { numerator: Number(match[1]), denominator: Number(match[2]) }
    : { numerator: 4, denominator: 4 };
}
function abcKeyAccidentals(key: string, minor: boolean): Record<string, string> {
  const normalized = key[0].toUpperCase() + key.slice(1);
  const major: Record<string, Record<string, string>> = {
    C: {},
    G: { F: '#' },
    D: { F: '#', C: '#' },
    A: { F: '#', C: '#', G: '#' },
    E: { F: '#', C: '#', G: '#', D: '#' },
    B: { F: '#', C: '#', G: '#', D: '#', A: '#' },
    F: { B: 'b' },
    Bb: { B: 'b', E: 'b' },
    Eb: { B: 'b', E: 'b', A: 'b' },
    Ab: { B: 'b', E: 'b', A: 'b', D: 'b' },
  };
  if (minor) {
    const relativeMajor: Record<string, string> = {
      A: 'C',
      E: 'G',
      B: 'D',
      'F#': 'A',
      'C#': 'E',
      D: 'F',
      G: 'Bb',
      C: 'Eb',
      F: 'Ab',
    };
    return major[relativeMajor[normalized] ?? normalized] ?? {};
  }
  return major[normalized] ?? {};
}
function midiPitch(value: number): string {
  const names = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  return `${names[value % 12]}${Math.floor(value / 12) - 1}`;
}

/**
 * Import the pitch-bearing part of GABC. Gregorian neumes are not forced into
 * a guessed metrical hymn: neume notes remain ordered, phrase markers become
 * phrase boundaries, and the result is marked as free rhythm for the arranger.
 */
export function parseGabc(source: string, id = 'gabc-score'): Score {
  const metadata = Object.fromEntries(
    [...source.matchAll(/^([\w-]+):([^;\n]*);/gm)].map((match) => [match[1], match[2].trim()]),
  );
  const mode = metadata.mode ? Number(metadata.mode) : undefined;
  const body = source.split('%%')[1] ?? source;
  const events: ScoreNote[] = [];
  const phrases: number[] = [];
  let cursor = 0;
  let firstGroup = true;
  for (const match of body.matchAll(/\(([^)]*)\)/g)) {
    const inner = match[1];
    const tokens = [...inner.matchAll(/[a-m](?:\d+|['_,#]*)/gi)].map((item) => item[0]);
    const isClef = firstGroup && tokens.some((token) => /\d/.test(token));
    firstGroup = false;
    if (isClef) continue;
    if (!tokens.length) {
      if (inner.includes('::') || inner.includes(':')) phrases.push(cursor);
      continue;
    }
    const phraseWeight = inner.includes('..') ? 3 : inner.includes('.') ? 2 : 1;
    const shortDuration = tokens.length > 1 ? 0.5 : 0.75;
    for (const [index, token] of tokens.entries()) {
      const pitch = gabcPitch(token);
      if (!pitch) continue;
      const finalWeight = index === tokens.length - 1 ? phraseWeight : shortDuration;
      events.push({
        pitch,
        startBeat: cursor,
        durationBeats: finalWeight,
        velocity: 0.84,
        voice: 'chant',
      });
      cursor += finalWeight;
    }
    if (inner.includes('::') || inner.includes(':')) phrases.push(cursor);
  }
  return {
    id,
    name: metadata.name ?? id,
    tempoBpm: 48,
    meter: { numerator: 1, denominator: 1 },
    ppq: 480,
    events,
    mode,
    rhythmicCharacter: 'free',
    phrases: [...new Set(phrases)].filter((value) => value > 0),
  };
}

export function gabcToMelody(source: string, id: string): Melody {
  const score = parseGabc(source, id);
  return {
    id: score.id,
    name: score.name,
    bpm: score.tempoBpm,
    notes: score.events.map((event) => ({
      pitch: event.pitch,
      duration: event.durationBeats,
      beat: event.startBeat,
      velocity: event.velocity,
      voice: event.voice,
    })),
    notationFormat: 'gabc',
    notation: source,
    mode: score.mode,
    rhythmicCharacter: 'free',
    score,
  };
}

function gabcPitch(token: string): string | undefined {
  const letter = token[0].toLowerCase();
  // GABC uses thirteen staff positions, a–m. With the common c-clef
  // convention used by the bundled sources, c is middle C and the sequence
  // continues diatonically through the upper positions. The old importer
  // skipped A/B between g and h, shifting most chant melodies by a third.
  const diatonic: Record<string, number> = {
    a: 57,
    b: 59,
    c: 60,
    d: 62,
    e: 64,
    f: 65,
    g: 67,
    h: 69,
    i: 71,
    j: 72,
    k: 74,
    l: 76,
    m: 77,
  };
  if (diatonic[letter] === undefined) return undefined;
  const octaveShift = (token.match(/'/g)?.length ?? 0) - (token.match(/,/g)?.length ?? 0);
  return midiPitch(diatonic[letter] + octaveShift * 12);
}

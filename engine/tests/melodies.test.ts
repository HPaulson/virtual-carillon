import { describe, expect, it } from 'vitest';
import { parseAbc, parseGabc, parseMidi, parseMusicXml } from '../src/melodies/parsers.js';

describe('notation parsers', () => {
  it('parses a compact ABC melody with rests and durations', () => {
    const melody = parseAbc('X:1\nT: Test\nQ: 90\nK:C\nC D2 z E');
    expect(melody.name).toBe('Test');
    expect(melody.bpm).toBe(90);
    expect(melody.notes.map((note) => note.pitch)).toEqual(['C4', 'D4', 'rest', 'E4']);
    expect(melody.notes[1].duration).toBe(2);
  });

  it('expands ABC repeat sections so a hymn does not stop at the first strain', () => {
    const melody = parseAbc('X:1\nT:Repeat\nM:4/4\nL:1/4\nK:C\n|: C D | E F :|');
    expect(melody.notes.map((note) => note.pitch)).toEqual([
      'C4',
      'D4',
      'E4',
      'F4',
      'C4',
      'D4',
      'E4',
      'F4',
    ]);
  });

  it('maps the complete GABC a–m staff positions and skips the clef group', () => {
    const score = parseGabc(
      'name:Test; mode:1; %% (c4) (a) (b) (c) (d) (e) (f) (g) (h) (i) (j) (k)',
    );
    expect(score.events.map((event) => event.pitch)).toEqual([
      'A3',
      'B3',
      'C4',
      'D4',
      'E4',
      'F4',
      'G4',
      'A4',
      'B4',
      'C5',
      'D5',
    ]);
  });

  it('parses MusicXML pitch, rest, divisions, and tempo', () => {
    const melody = parseMusicXml(
      '<score-partwise><work><work-title>Test XML</work-title></work><part><measure><attributes><divisions>2</divisions></attributes><note><pitch><step>C</step><octave>4</octave></pitch><duration>2</duration></note><note><rest/><duration>1</duration></note></measure></part></score-partwise>',
    );
    expect(melody.name).toBe('Test XML');
    expect(melody.notes.map((note) => note.pitch)).toEqual(['C4', 'rest']);
    expect(melody.notes[0].duration).toBe(1);
    expect(melody.notes[1].beat).toBe(1);
  });

  it('parses a single-note Standard MIDI file', () => {
    const bytes = Uint8Array.from([
      0x4d, 0x54, 0x68, 0x64, 0, 0, 0, 6, 0, 0, 0, 1, 0, 96, 0x4d, 0x54, 0x72, 0x6b, 0, 0, 0, 12, 0,
      0x90, 60, 100, 0x60, 0x80, 60, 64, 0, 0xff, 0x2f, 0,
    ]);
    const melody = parseMidi(bytes);
    expect(melody.notationFormat).toBe('midi');
    expect(melody.notes[0]).toMatchObject({ pitch: 'C4', duration: 1, beat: 0 });
  });
});

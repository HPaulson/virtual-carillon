import { describe, expect, it } from 'vitest';
import { cycleHymns, shuffled } from '../src/cli/hymn-cycle.js';

const hymns = [
  { id: 'first', name: 'First' },
  { id: 'second', name: 'Second' },
  { id: 'third', name: 'Third' },
];

describe('hymn cycle', () => {
  it('shuffles a copy without changing the source list', () => {
    const source = [1, 2, 3, 4];
    const result = shuffled(source, () => 0);
    expect(result).toEqual([2, 3, 4, 1]);
    expect(source).toEqual([1, 2, 3, 4]);
  });

  it('plays a finite shuffled cycle and reshuffles after each pass', async () => {
    const played: string[] = [];
    await cycleHymns(
      hymns,
      async (hymn) => {
        played.push(hymn.id);
        return 0;
      },
      { count: 5, random: () => 0, wait: async () => {} },
    );

    expect(played).toHaveLength(5);
    expect(new Set(played.slice(0, 3)).size).toBe(3);
    expect(played[2]).not.toBe(played[3]);
  });

  it('stops when aborted between hymns', async () => {
    const controller = new AbortController();
    const played: string[] = [];
    await cycleHymns(
      hymns,
      async (hymn) => {
        played.push(hymn.id);
        controller.abort();
        return 0;
      },
      { signal: controller.signal, wait: async () => {} },
    );

    expect(played).toHaveLength(1);
  });
});

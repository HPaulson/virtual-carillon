export interface CycleHymn {
  id: string;
  name: string;
}

export interface HymnCycleOptions {
  count?: number;
  pauseSeconds?: number;
  signal?: AbortSignal;
  random?: () => number;
  wait?: (seconds: number, signal?: AbortSignal) => Promise<void>;
}

export type PlayHymn = (hymn: CycleHymn) => Promise<number>;

/**
 * Play shuffled hymn passes until count is reached or the signal is aborted.
 * A new pass is shuffled independently, while avoiding an immediate boundary
 * repeat when at least two hymns are available.
 */
export async function cycleHymns(
  hymns: CycleHymn[],
  play: PlayHymn,
  options: HymnCycleOptions = {},
): Promise<void> {
  if (!hymns.length) throw new Error('No hymns are available to play.');
  if (options.count !== undefined && (!Number.isInteger(options.count) || options.count < 1)) {
    throw new Error('Hymn count must be a positive integer.');
  }
  if (
    options.pauseSeconds !== undefined &&
    (!Number.isFinite(options.pauseSeconds) || options.pauseSeconds < 0)
  ) {
    throw new Error('Pause must be a non-negative number of seconds.');
  }

  const signal = options.signal;
  const wait = options.wait ?? waitSeconds;
  const random = options.random ?? Math.random;
  const target = options.count ?? Number.POSITIVE_INFINITY;
  let played = 0;
  let previous: CycleHymn | undefined;

  while (played < target && !signal?.aborted) {
    const pass = shuffled(hymns, random);
    if (previous && pass.length > 1 && pass[0].id === previous.id) {
      [pass[0], pass[1]] = [pass[1], pass[0]];
    }

    for (const hymn of pass) {
      if (played >= target || signal?.aborted) break;
      const durationSeconds = await play(hymn);
      played += 1;
      previous = hymn;
      await wait(durationSeconds + (options.pauseSeconds ?? 0), signal);
    }
  }
}

export function shuffled<T>(values: T[], random = Math.random): T[] {
  const result = [...values];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
  }
  return result;
}

export function waitSeconds(seconds: number, signal?: AbortSignal): Promise<void> {
  if (seconds <= 0 || signal?.aborted) return Promise.resolve();
  return new Promise((resolve) => {
    const timer = setTimeout(resolve, seconds * 1000);
    signal?.addEventListener(
      'abort',
      () => {
        clearTimeout(timer);
        resolve();
      },
      { once: true },
    );
  });
}

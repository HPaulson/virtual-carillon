# Testing and Validation

## Automated checks

Run all four checks before handing work to another agent:

```bash
pnpm typecheck
pnpm build
pnpm test
pnpm lint
```

Current tests cover the 77-bell registry, per-register tails, distance attenuation, clipping/DC safety, tail-safe sequence rendering, polyphonic overlap and register diagnostics, source-backed Westminster/Angelus/Office semantics, GABC/ABC chant and hymn imports, distinct multi-voice hymn settings, hymn metadata/rendering, user recording import, notation parsing, scheduler failure isolation, LitCal cache/offline behavior, actual-grade primary-celebration ordering, and catalog feast/category/season fallback plus selection strategies.

## Manual CLI smoke test

```bash
node dist/cli/index.js doctor
node dist/cli/index.js test
node dist/cli/index.js shuffle-hymns --count 1
node dist/cli/index.js play test-bell --distance half-mile
node dist/cli/index.js play westminster-quarter
node dist/cli/index.js assets
```

Confirm that the cache contains WAV files and that playback uses the expected host player. On macOS this is normally `afplay`; on Linux it should be `pw-play` for PipeWire.

For objective audio checks, `ffprobe` should report stereo PCM at the configured sample rate. `ffmpeg -af volumedetect` should show a non-clipping peak and a natural decay. `analyzeAudio` reports peak, RMS, DC offset, tail/body ratio, and spectral diagnostics. A render on macOS does not validate PipeWire, Bluetooth, or Echo Show output.

## Manual API smoke test

Start `node dist/cli/index.js server`, then query:

```bash
curl http://127.0.0.1:9876/health
curl http://127.0.0.1:9876/api/status
curl http://127.0.0.1:9876/api/devices
curl http://127.0.0.1:9876/api/assets
curl http://127.0.0.1:9876/api/hymns
curl http://127.0.0.1:9876/api/liturgical/2026-08-15/hymn
curl http://127.0.0.1:9876/api/schedules
curl -X POST http://127.0.0.1:9876/api/play \
  -H 'content-type: application/json' \
  -d '{"asset":"test-bell"}'
```

Always stop the server after an interactive smoke test. Do not report real Bluetooth/Echo Show validation unless the test ran on Linux with that device connected.

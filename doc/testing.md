# Testing and Validation

## Automated checks

Run all four checks before handoff:

```bash
pnpm typecheck
pnpm build
pnpm test
pnpm lint
```

Tests cover the bell registry, synthesis safety, distance attenuation, sequence rendering, score parsing/arranging, hymn metadata and selection, user recording import, LitCal normalization/cache behavior, database event history, and API validation/selection.

## Manual CLI smoke test

```bash
node dist/cli/index.js doctor
node dist/cli/index.js test
node dist/cli/index.js shuffle-hymns --count 1
node dist/cli/index.js assets
```

Confirm that the cache contains WAV files. Native CLI playback can be tested separately when the development host has an audio backend, but it is not required for the Docker/Home Assistant deployment.

## Manual API smoke test

Start `node dist/cli/index.js server`, then query:

```bash
# Add this header to every /api/* request when VIRTUAL_CARILLON_API_TOKEN is set.
curl http://127.0.0.1:9876/health
curl -H 'Authorization: Bearer YOUR_TOKEN' http://127.0.0.1:9876/api/status
curl -H 'Authorization: Bearer YOUR_TOKEN' http://127.0.0.1:9876/api/devices
curl -H 'Authorization: Bearer YOUR_TOKEN' http://127.0.0.1:9876/api/assets
curl -H 'Authorization: Bearer YOUR_TOKEN' http://127.0.0.1:9876/api/hymns
curl -H 'Authorization: Bearer YOUR_TOKEN' 'http://127.0.0.1:9876/api/liturgical/2026-08-15/hymn?calendar=general'
curl -H 'Authorization: Bearer YOUR_TOKEN' http://127.0.0.1:9876/api/assets/test-bell/audio -o /tmp/test-bell.wav
```

In Home Assistant, add the integration, configure LitCal in its Options flow, open the **Virtual Carillon** media source, browse to `test-bell`, and play it on a known-good `media_player`. Also exercise `virtual_carillon.play` and `virtual_carillon.select_hymn` with media-player targets. This validates the intended deployment path; speaker-specific behavior remains the responsibility of that media-player integration.

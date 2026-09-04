# Testing

## Automated checks

Run the normal project checks while developing:

```bash
pnpm check
```

Before review or release preparation, run the local CI preflight:

```bash
pnpm ci:check
```

`pnpm ci:check` runs `pnpm check`, validates release metadata, compiles the Home Assistant integration, validates JSON metadata, builds the Docker image, and performs an authenticated API smoke test. It requires Docker and Python 3.

The test suite covers bell synthesis and distance rendering, hymn notation and arrangements, LitCal normalization and caching, liturgical metadata and selection, imported recordings, schedule matching and claims, database history, and API validation.

## Local command-line smoke test

Build first, then run:

```bash
node engine/dist/cli/index.js doctor
node engine/dist/cli/index.js assets
node engine/dist/cli/index.js test
node engine/dist/cli/index.js shuffle-hymns --count 1
node engine/dist/cli/index.js hymn-order --count 3
```

`test` renders representative bells, signals, chant, and hymns. Confirm that WAV files appear under the configured data directory’s `cache/` folder. Native playback needs a working local audio backend and is not part of the Docker/Home Assistant smoke path.

## API smoke test

Start the server with an API token, then query it:

```bash
VIRTUAL_CARILLON_API_TOKEN=test-token node engine/dist/cli/index.js server
```

In another terminal:

```bash
curl http://127.0.0.1:9876/health
curl -H 'Authorization: Bearer test-token' http://127.0.0.1:9876/api/status
curl -H 'Authorization: Bearer test-token' http://127.0.0.1:9876/api/assets
curl -H 'Authorization: Bearer test-token' http://127.0.0.1:9876/api/hymns
curl -H 'Authorization: Bearer test-token' \
  'http://127.0.0.1:9876/api/liturgical/2026-08-15/hymn?calendar=general'
curl -H 'Authorization: Bearer test-token' \
  http://127.0.0.1:9876/api/assets/test-bell/audio -o /tmp/test-bell.wav
```

For native schedule testing, save an output-targeted schedule and call `POST /api/schedule/run` at a due time. See the [API reference](api.md#schedules) for the public schedule format.

## Home Assistant smoke test

1. Add the integration and confirm that the **Virtual Carillon Status** sensor is `online`.
2. In the media browser, play `test-bell` on one known-working media player.
3. Use **Configure** to turn on schedules and create a Manual test routine a few minutes ahead.
4. Confirm that it plays once, then test Westminster and an Automatic hymn routine.
5. Remove or disable the test routine afterward.

This validates the intended path from engine to Home Assistant media player. Speaker-specific behavior belongs to the media-player integration being used.

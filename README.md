# Virtual Carillon

Virtual Carillon is a Linux-first, Docker-deployable Node.js/TypeScript engine for a large virtual church carillon. It keeps clock chimes, tower bells, monastery bells, a 77-bell C1–E7 carillon, traditional bell signals, source-backed chant/hymn scores, and user recordings as distinct content. It renders cached polyphonic stereo WAV files, serves them through its API, and lets Home Assistant choose which media players should play them.

## Quick start

```bash
cp .env.example .env
docker compose up -d --build
docker compose exec virtual-carillon node dist/cli/index.js doctor
docker compose exec virtual-carillon node dist/cli/index.js test
```

For a native development install:

```bash
pnpm install
pnpm build
node dist/cli/index.js doctor
node dist/cli/index.js test
node dist/cli/index.js play test-bell
node dist/cli/index.js server
```

The container runs the engine on Linux and does not require access to the host's audio devices. Home Assistant's media-player integrations handle the actual speakers. Full Dokploy and Home Assistant guidance is in [docs/docker.md](docs/docker.md).

Commands: `status`, `devices`, `play <asset>`, `stop`, `test`, `shuffle-hymns`, `doctor`, `instrument`, `diagnose <hymn>`, `server`, `assets`, and `import`. `shuffle-hymns` continuously plays shuffled hymns until interrupted; use `--count` for a finite run and `--pause` for a gap between hymns.

For a Linux server managed by Dokploy, deploy the same `compose.yaml` as a Docker Compose service. Configure only one `.env` through Dokploy, as described in [docs/docker.md](docs/docker.md).

The built-in library includes source-backed Westminster quarters, two documented Angelus patterns, configurable Divine Office bell signals, and thirty-nine source-backed Latin, Anglican, Welsh, English, and traditional hymn scores. Hymns retain their GABC/ABC melody source and use distinct carillon settings: contemplative drones, flowing broken-chord textures, solemn chant-like voicing, grand chorale chords, and celebratory octave-doubled settings. Each setting includes independent melody, harmony, inner-voice, bass, and passing-tone events; natural bell tails overlap at the half-mile distance profile. ABC repeats are expanded into complete forms before arranging, and Gregorian GABC imports preserve phrase boundaries while mapping the full a–m pitch range. Hymns and other assets expose reusable stable-ID liturgical tags for feasts, categories, seasons, offices, and canonical hours. When LitCal is enabled in Home Assistant, automatic hymn selection uses the highest-priority celebration and exact-feast → category → season → General fallback, with random, sequential, and fixed overrides available from the API and Home Assistant. The bell renderer uses individually identified inharmonic modal profiles, independent frequency-dependent decays, polyphonic natural tails, and an outdoor distance model whose default is half-mile. Audio is generated to `.data/cache` on first use. No third-party recording is bundled without redistribution rights; import local recordings with `virtual-carillon import`.

## Home Assistant

The integration in `homeassistant/custom_components/virtual_carillon` connects to the Node API and provides a status sensor, hymn/asset metadata, today's LitCal data, a browsable media source, and target-based actions. `virtual_carillon.play` and `virtual_carillon.select_hymn` accept one or more Home Assistant `media_player` targets and expose the complete liturgical-selection query. Copy it to Home Assistant's `custom_components` directory, then add it from the UI with the engine URL and API token. Keep schedules and output choices in HA automations; the included scheduled-routine blueprint covers exact, hourly, 15-minute, 30-minute, weekday, exclusion, ordered-step, and delay behavior. LitCal enablement and calendar selection are configured in the integration Options flow and cached for offline operation.

## Development

```bash
pnpm typecheck
pnpm test
pnpm lint
```

The development environment can be macOS or Linux. Native CLI playback is available for development when the host has an audio backend, but it is not required by the Docker/Home Assistant deployment. No Amazon API is required.

## License

MIT. See [LICENSE](LICENSE).

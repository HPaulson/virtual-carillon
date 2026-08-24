# Virtual Carillon

Virtual Carillon is a Linux-first, Docker-deployable Node.js/TypeScript engine for a large virtual church carillon. It keeps clock chimes, tower bells, monastery bells, a 77-bell C1–E7 carillon, traditional bell signals, source-backed chant/hymn scores, and user recordings as distinct content. It renders cached polyphonic stereo WAV files, sends them to PipeWire (including generic Bluetooth sinks such as an Echo Show), and exposes a local API for Home Assistant.

## Quick start

```bash
cp .env.example .env
docker compose up -d --build
docker compose exec virtual-carillon node dist/cli/index.js doctor
docker compose exec virtual-carillon node dist/cli/index.js play test-bell
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

The base container is host-portable and does not assume Linux audio devices. On Linux, use the optional PipeWire override for direct Bluetooth playback. On macOS or Windows, consume rendered audio through the HTTP audio endpoint or a Home Assistant/network media player. Full platform guidance is in [docs/docker.md](docs/docker.md).

For Linux direct playback, start with both Compose files:

```bash
HOST_XDG_RUNTIME_DIR="${XDG_RUNTIME_DIR:-/run/user/$(id -u)}" \
  docker compose -f compose.yaml -f compose.linux.yaml up -d --build
```

Commands: `status`, `devices`, `play <asset>`, `stop`, `test`, `shuffle-hymns`, `doctor`, `instrument`, `diagnose <hymn>`, `server`, `assets`, `import`, and `profile monastery`. `shuffle-hymns` continuously plays shuffled hymns until interrupted; use `--count` for a finite run and `--pause` for a gap between hymns.

The built-in library includes source-backed Westminster quarters, two documented Angelus patterns, configurable Divine Office bell signals, and thirty-nine source-backed Latin, Anglican, Welsh, English, and traditional hymn scores. Hymns retain their GABC/ABC melody source and use distinct carillon settings: contemplative drones, flowing broken-chord textures, solemn chant-like voicing, grand chorale chords, and celebratory octave-doubled settings. Each setting includes independent melody, harmony, inner-voice, bass, and passing-tone events; natural bell tails overlap at the half-mile distance profile. ABC repeats are expanded into complete forms before arranging, and Gregorian GABC imports preserve phrase boundaries while mapping the full a–m pitch range. Hymns and other assets expose reusable stable-ID liturgical tags for feasts, categories, seasons, offices, canonical hours, language, rite, and tradition. When LitCal is enabled, automatic hymn selection uses the highest-priority celebration and exact-feast → category → season → General fallback, with random, sequential, and fixed overrides available from the API and Home Assistant. The bell renderer uses individually identified inharmonic modal profiles, independent frequency-dependent decays, polyphonic natural tails, and an outdoor distance model whose default is half-mile. Audio is generated to `.data/cache` on first use. No third-party recording is bundled without redistribution rights; import local recordings with `virtual-carillon import`.

## Home Assistant

The integration in `homeassistant/custom_components/virtual_carillon` connects to the local Node API and provides a status sensor, hymn/asset metadata, today's LitCal data, and a speaker entity. `virtual_carillon.select_hymn` supports automatic selection or fixed/random/sequential category and feast overrides. Copy it to Home Assistant's `custom_components` directory, start the engine, then add it from the UI. Keep ordinary schedule and output choices in HA automations or a dashboard; the API stores schedule definitions in SQLite. Liturgical calendar selection is optional and cached for offline operation.

## Development

```bash
pnpm typecheck
pnpm test
pnpm lint
```

The development environment can be macOS or Linux. macOS uses `afplay` for an audible smoke test; Linux prefers `pw-play`, then `paplay`, then `ffplay`. No Amazon API is required.

## License

MIT. See [LICENSE](LICENSE).

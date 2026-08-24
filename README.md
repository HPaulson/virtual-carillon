# Virtual Carillon

Virtual Carillon is a Linux-first, Docker-deployable Node.js/TypeScript engine for a large virtual church carillon. It keeps clock chimes, tower bells, monastery bells, a 77-bell C1–E7 carillon, traditional bell signals, source-backed chant/hymn scores, and user recordings as distinct content. It renders cached polyphonic stereo WAV files, serves them through its API, and lets Home Assistant choose which media players should play them.

The project is designed for a Home Assistant-first deployment: the container
renders and serves audio while Home Assistant selects the actual speakers.
Native Linux playback is supported as an optional development/runtime path.

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

The container runs the engine on Linux and does not require access to the host's audio devices for the HA path. Home Assistant's media-player integrations handle the actual speakers; a native installation can configure and run the same schedule through the API. Full Dokploy and Home Assistant guidance is in [docs/docker.md](docs/docker.md).

Commands: `status`, `devices`, `play <asset>`, `stop`, `test`, `shuffle-hymns`, `doctor`, `instrument`, `diagnose <hymn>`, `server`, `schedule show`, `schedule reset`, `assets`, and `import`. `shuffle-hymns` continuously plays shuffled hymns until interrupted; use `--count` for a finite run and `--pause` for a gap between hymns.

For a Linux server managed by Dokploy, deploy the same `compose.yaml` as a Docker Compose service. Configure only one `.env` through Dokploy, as described in [docs/docker.md](docs/docker.md).

The built-in library includes source-backed Westminster quarters, two documented Angelus patterns, configurable Divine Office bell signals, and 62 source-backed Latin, Anglican, Welsh, English, and traditional hymn scores. Hymns use structured, human-editable melody notation and distinct carillon settings: contemplative drones, flowing broken-chord textures, solemn chant-like voicing, grand chorale chords, and celebratory octave-doubled settings. See [content provenance and rights](doc/content.md) for the boundary between public-domain compositions, source editions, project transcriptions, arrangements, and recordings. Audio is generated to `.data/cache` on first use. No third-party recording is bundled without redistribution rights; import local recordings with `virtual-carillon import`.

## Home Assistant

The integration in `homeassistant/custom_components/virtual_carillon` connects to the Node API and provides a status sensor, hymn/asset metadata, today's LitCal data, a browsable media source, target-based actions, and a server-owned schedule. The integration Configure flow has a simple Westminster setup plus unlimited “play asset or Liturgical Hymn at...” schedules with multiple times, days, time windows, asset dropdowns, and Home Assistant media players. `virtual_carillon.play` and `virtual_carillon.select_hymn` remain available for advanced automations.

## Development

```bash
pnpm typecheck
pnpm test
pnpm lint
```

The development environment can be macOS or Linux. Native CLI playback is available for development when the host has an audio backend, but it is not required by the Docker/Home Assistant deployment. No Amazon API is required.

See [CONTRIBUTING.md](CONTRIBUTING.md) for content, testing, and pull-request
guidance. Operational details are in [doc/operations.md](doc/operations.md)
and [docs/docker.md](docs/docker.md).

## License

The software is MIT-licensed. Bundled hymn and bell content has separate
provenance notes and is not automatically covered by the software license; see
[doc/content.md](doc/content.md). See [LICENSE](LICENSE) for the software
license.

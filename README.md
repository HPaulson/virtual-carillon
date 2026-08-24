# Virtual Carillon

Virtual Carillon is a Linux-first, Docker-deployable Node.js/TypeScript engine for a large virtual church carillon. It renders generated bells, clock chimes, traditional bell signals, and a curated public-domain melody library to cached stereo WAV files, serves them through its API, and lets Home Assistant choose which media players play them.

The project is designed for a Home Assistant-first deployment: the container
renders and serves audio while Home Assistant selects the actual speakers.
Native Linux playback is supported as an optional development/runtime path.

## Quick start

```bash
cp .env.example .env
# Set VIRTUAL_CARILLON_API_TOKEN to a long random value in .env.
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

The container runs the engine on Linux and does not require access to the host's audio devices for the HA path. Home Assistant's media-player integrations handle the actual speakers; a native installation can configure and run the same schedule through the API. See [Docker and Home Assistant deployment](docs/docker.md).

Commands: `status`, `devices`, `play <asset>`, `stop`, `test`, `shuffle-hymns`, `doctor`, `instrument`, `diagnose <hymn>`, `server`, `schedule show`, `schedule reset`, `assets`, and `import`. `shuffle-hymns` continuously plays shuffled hymns until interrupted; use `--count` for a finite run and `--pause` for a gap between hymns.

For a Linux server, deploy the same `compose.yaml` with Docker Compose and keep the API token in the server's `.env` file.

The built-in library includes Westminster quarters, two Angelus patterns, configurable Divine Office bell signals, and a curated melody catalog. Hymns use structured, human-editable notation and procedural carillon arrangements. Audio is generated to `.data/cache` on first use. No third-party recording is bundled; import local recordings with `virtual-carillon import`. See [music rights and provenance](MUSIC_RIGHTS.md) before using or contributing musical content.

## Home Assistant

The integration in `homeassistant/custom_components/virtual_carillon` connects to the Node API and provides a status sensor, asset metadata, today's LitCal data, a browsable media source, target-based actions, and a server-owned schedule. Its configuration flow supports Westminster, fixed-asset, and liturgical-melody schedules with multiple times, days, time windows, and Home Assistant media-player targets.

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

The software and project-authored procedural arrangements are MIT-licensed.
Bundled musical material has separate rights status and provenance; see
[MUSIC_RIGHTS.md](MUSIC_RIGHTS.md). See [LICENSE](LICENSE) for the software
license.

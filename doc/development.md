# Development Workflow

## Requirements

- Node.js 22.5+ (`node:sqlite` is required)
- pnpm 10.x or the version declared by `package.json`
- Linux: PipeWire tools (`wpctl`, `pw-play`) for native audio testing
- Optional: `ffmpeg`/`ffplay` for format conversion and fallback playback

## Install and validate

```bash
pnpm install
pnpm typecheck
pnpm build
pnpm test
pnpm lint
```

`pnpm build` clears the generated audio cache at `.data/cache` before compiling. Rendered WAV files are regenerated on demand, so cache invalidation does not require versioned filenames.

The production build is emitted to `dist/`. The CLI is normally invoked as `node dist/cli/index.js ...`; after packaging, `bin/virtual-carillon.mjs` provides the `virtual-carillon` command.

## Useful commands

```bash
node dist/cli/index.js doctor
node dist/cli/index.js devices
node dist/cli/index.js assets
node dist/cli/index.js test
node dist/cli/index.js shuffle-hymns --count 3
node dist/cli/index.js play test-bell
node dist/cli/index.js play westminster-quarter
node dist/cli/index.js stop
node dist/cli/index.js server
```

`pnpm dev` runs the TypeScript CLI through `tsx`; it starts the API server. The default bind is `127.0.0.1:9876`.

Import a local recording without copying unlicensed third-party material into the repository:

```bash
node dist/cli/index.js import --name "My Church Angelus" --file /path/to/angelus.wav
```

## Configuration variables

| Variable                       | Default     | Notes                                                                     |
| ------------------------------ | ----------- | ------------------------------------------------------------------------- |
| `VIRTUAL_CARILLON_DATA_DIR`    | `.data`     | SQLite file and render cache                                              |
| `VIRTUAL_CARILLON_HOST`        | `127.0.0.1` | Set to `0.0.0.0` in Docker                                                |
| `VIRTUAL_CARILLON_PORT`        | `9876`      | HTTP port                                                                 |
| `VIRTUAL_CARILLON_API_TOKEN`   | unset       | Bearer token for `/api/*`; set a long random value for remote deployments |
| `VIRTUAL_CARILLON_SAMPLE_RATE` | `44100`     | Only 44100 and 48000 are accepted                                         |

## Editing rules

- Preserve separation between audio, library, database, and Home Assistant code.
- Add or update tests for synthesis, database behavior, and API behavior when those areas change.
- Use `apply_patch` for source edits. Do not commit generated `dist/`, `node_modules/`, `.data/`, or local `data/` contents.
- When adding an asset, add its definition, a stable cache key, a rights/provenance note, and a test or manual render check.
- Keep API errors explicit. Unknown assets should not silently become a medium bell.

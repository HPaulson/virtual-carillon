# Development

This guide is for contributors working on the Virtual Carillon engine, Home Assistant integration, Home Assistant app, documentation, and hymn catalog.

## Requirements

- Node.js 24 or later. The engine uses the built-in `node:sqlite` module.
- pnpm 10.29.2, as declared in `package.json`.
- Python 3 for Home Assistant syntax and metadata checks.
- Docker for the complete local CI check and container smoke test.
- On Linux, PipeWire tools (`wpctl` and `pw-play`) for native audio testing. `ffplay` is an optional fallback.

## Start a change

Create a branch from the current `main` branch:

```bash
git switch main
git pull --ff-only
git switch -c my-change
```

Install dependencies from the lockfile:

```bash
pnpm install --frozen-lockfile
```

Keep runtime data in the ignored `.data/` directory. Do not use a production data directory while developing; commands such as `schedule reset` and the daily-history reset script change persistent state.

## Local checks

The engine tests live beside the engine in `engine/tests/`; the Home Assistant integration currently has syntax and metadata validation but no Python test suite. The usual check is:

```bash
pnpm check
```

This runs, in order:

- Prettier’s formatting check;
- the TypeScript compiler;
- ESLint;
- the Vitest test suite; and
- the production TypeScript build.

Before opening a pull request, run the fuller preflight:

```bash
pnpm ci:check
```

`pnpm ci:check` runs `pnpm check`, verifies that release versions agree across the project, compiles the Home Assistant integration, validates JSON metadata, builds the Docker image, starts it with an API token, and checks both `/health` and an authenticated API endpoint. Docker and Python 3 are required. The GitHub Actions workflow performs the same checks in separate validation and container jobs.

If a change affects only documentation, `pnpm exec prettier --check <files>` and `git diff --check` are still useful. Run `pnpm check` for changes that touch source, configuration, tests, or generated package inputs.

## Run the engine locally

Start the development server through `tsx`:

```bash
pnpm dev
```

The default address is `http://127.0.0.1:9876`. Set `VIRTUAL_CARILLON_API_TOKEN` when testing authenticated requests. Environment variables and their defaults are listed in the [configuration reference](configuration.md).

After a build, useful command-line checks include:

```bash
pnpm build
node engine/dist/cli/index.js assets
node engine/dist/cli/index.js doctor
node engine/dist/cli/index.js devices
node engine/dist/cli/index.js test
node engine/dist/cli/index.js hymn-order --count 3
node engine/dist/cli/index.js diagnose salve-regina
node engine/dist/cli/index.js schedule show
```

`hymn-order` previews automatic selection without playing audio. `test` renders representative bells, signals, chants, and hymns. Native playback requires a working local audio backend and is separate from the Home Assistant and Docker playback path.

`pnpm build` clears `.data/cache` before compiling. Rendered WAV files are regenerated when needed and should not be committed.

## Useful scripts

| Command or script                     | Purpose                                                                                                                                                            |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `pnpm dev`                            | Run the TypeScript server directly through `tsx`.                                                                                                                  |
| `pnpm build`                          | Clear the render cache and build `engine/dist/`, failing if the compiler fails.                                                                                    |
| `pnpm test`                           | Run the automated tests once.                                                                                                                                      |
| `pnpm test:watch`                     | Re-run tests while developing.                                                                                                                                     |
| `pnpm typecheck`                      | Run TypeScript without emitting files.                                                                                                                             |
| `pnpm lint`                           | Run ESLint.                                                                                                                                                        |
| `pnpm format`                         | Format repository files with Prettier.                                                                                                                             |
| `pnpm check`                          | Run the normal source checks and build.                                                                                                                            |
| `pnpm ci:check`                       | Run the full local CI preflight, including Docker.                                                                                                                 |
| `pnpm release:check`                  | Verify the project version in every release metadata file.                                                                                                         |
| `scripts/reset-daily.sh [YYYY-MM-DD]` | Reset hosted Automatic-hymn history for a date. Requires SSH settings in `dev.env`; use carefully.                                                                 |
| `scripts/push-live.sh`                | Deploy the current engine and integration to configured live Docker containers and restart them. This is a development deployment helper, not the release process. |

### `scripts/push-live.sh`

This script deploys the current working tree’s engine and Home Assistant integration to a remote Docker-based installation. It runs pnpm typecheck, archives `homeassistant/integration`, installs it into Home Assistant’s runtime `/config/custom_components/virtual_carillon` location, builds the engine image on the remote host for its architecture, and force-recreates the engine through its existing Compose project. It then restarts Home Assistant and waits for the Home Assistant health check. The engine’s persistent data volume is preserved and not modified. This is useful for live-testing the integration, though a local Home Assistant instance may also be used. The first run may take several minutes because the image installs FFmpeg and its dependencies.

Create a local, ignored `dev.env` with at least:

```bash
REMOTE_HOST=your-ssh-host
HA_CONTAINER=homeassistant
```

The engine container and Compose project are detected from Docker Compose labels. If the engine is not Compose-managed, set these additional values:

```bash
CARILLON_CONTAINER=virtual-carillon
CARILLON_COMPOSE_DIR=/path/to/compose/project
CARILLON_COMPOSE_FILE=/path/to/compose/project/compose.yaml
```

Run it from the repository root:

```bash
bash scripts/push-live.sh
```

The script does not update a release tag or run the full CI preflight. Confirm the working tree and target containers before using it. For a public release, use the branch, CI, merge, and tag process below.

### `scripts/reset-daily.sh`

This script calls the hosted engine’s `POST /api/hymns/reset-day` endpoint through SSH. It resets Automatic-hymn repeat history for today, or for a supplied `YYYY-MM-DD` date. Set `REMOTE_HOST` and, when necessary, `CARILLON_CONTAINER` in `dev.env`:

```bash
REMOTE_HOST=your-ssh-host
CARILLON_CONTAINER=virtual-carillon
```

Use this when testing a day’s selection again. It does not delete hymns, recordings, schedules, or rendered audio.

## Adding content

For a bundled hymn or melody:

1. Give it a stable, descriptive asset ID.
2. Use structured notation and accurate timing or score data.
3. Add only liturgical metadata that the content genuinely supports.
4. Add or update tests for notation, arrangement, metadata, or selection behavior.
5. Confirm that the project has the right to distribute the melody, arrangement, and any included text or recording.

For imported user recordings, follow [Content and recordings](content.md). User recordings and generated audio belong in runtime storage, not in the source tree.

## Public contracts

Treat the following as user-facing contracts:

- Home Assistant form labels, actions, services, and translations;
- schedule fields and routine modes;
- environment variables and their defaults;
- HTTP API routes, request fields, and response shapes;
- hymn IDs and liturgical metadata; and
- deployment and storage behavior described in the guides.

When behavior changes, update the implementation, tests, documentation, examples, and translations together. Keep Catholic and liturgical terminology accurate, and explain software behavior without assuming that users are developers.

Keep the major boundaries intact: audio synthesis, the asset library, persistence, LitCal handling, scheduling, and Home Assistant delivery should remain independently understandable.

## Release preparation

The project version is duplicated intentionally for the package, Home Assistant integration, Home Assistant app, and container metadata. These values must agree in:

- `package.json` (`version`);
- `homeassistant/integration/manifest.json` (`version`);
- `homeassistant/app/config.yaml` (`version`); and
- `Dockerfile` (`ARG BUILD_VERSION`).

Check them with:

```bash
pnpm release:check
```

For a release:

1. Update the version in all four files and add a concise entry to `CHANGELOG.md`.
2. Run `pnpm ci:check` on the release branch.
3. Open and review a pull request that includes the version and changelog changes.
4. Merge the reviewed pull request into `main` after CI passes.
5. Create an annotated `v<version>` tag on the current `main` commit and push the tag.

For example, version `0.1.0-beta.2` is published from the tag `v0.1.0-beta.2`.

The publish workflow runs only for tags beginning with `v`. It verifies that the tag points to the current `main` commit, reruns the project and release checks, validates the Home Assistant integration, and builds and publishes `linux/amd64` and `linux/arm64` images to GitHub Container Registry. A tag pointing to an older branch or commit is rejected.

The release process publishes the Home Assistant app container image. It does not automatically publish a package to npm or deploy the integration to a live Home Assistant installation.

## Files to keep out of commits

Do not commit:

- `.env`, `dev.env`, credentials, API tokens, or private URLs;
- `.data/`, SQLite databases, WAL files, or runtime caches;
- imported or private recordings;
- `engine/dist/`, `node_modules/`, Python bytecode, coverage output, or editor files; or
- generated WAV files.

The repository’s ignore rules cover the usual cases, but check `git status` before committing.

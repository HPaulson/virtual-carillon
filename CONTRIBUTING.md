# Contributing to Virtual Carillon

Thank you for helping improve Virtual Carillon. Contributions should preserve a dependable, prayerful, and flexible experience across the engine, Home Assistant integration, and supported playback targets.

## Before you begin

Read the [development guide](doc/development.md) for setup, checks, deployment helpers, and releases. The [architecture guide](doc/architecture.md) explains the project boundaries, and the [testing guide](doc/testing.md) describes the expected smoke tests.

For a bug, include the deployment method, the relevant date and calendar when liturgical selection is involved, steps to reproduce, and the useful portion of the logs. Remove API tokens, private URLs, personal information, and private recordings before posting.

Open an issue before starting a substantial behavior, API, scheduling, deployment, or liturgical-content change. Small documentation fixes and clearly scoped bug fixes can usually go directly into a pull request.

## Development expectations

Use the versions declared by the project:

```bash
pnpm install --frozen-lockfile
pnpm ci:check
```

The full preflight requires Node.js 24 or later, pnpm 10.29.2, Python 3, and Docker. It checks formatting, types, lint, tests, the build, release metadata, Home Assistant Python and JSON files, and the container’s authenticated API path.

When a change affects public behavior, update the relevant documentation, translations, examples, and tests together. This is especially important for:

- Home Assistant forms, actions, services, and media-browser items;
- schedule fields, routine modes, and time-window behavior;
- configuration variables and defaults;
- API request and response fields; and
- hymn IDs, liturgical metadata, and Automatic-mode selection.

For a new melody or hymn, provide a stable ID, structured notation, accurate metadata, and rights information. Do not add copyrighted recordings, arrangements, or text unless the project has clear permission to distribute them.

## Branches and pull requests

The `main` branch is protected. Work on a branch and open a pull request; do not push changes directly to `main`.

Keep a pull request focused and describe:

- what users will notice;
- which deployment paths or interfaces are affected;
- how the change was tested; and
- any migration, configuration, or release note that users need.

Keep the branch current when GitHub asks for an update, and rerun the checks after resolving conflicts. A review should be able to follow the change from implementation to tests and documentation without reconstructing unstated assumptions.

## Continuous integration

Pull requests and pushes to `main` run the **CI** workflow. It has two stages:

1. **Validate project** installs the locked dependencies, runs `pnpm check`, verifies release metadata, compiles the Home Assistant integration, and validates JSON metadata.
2. **Build and smoke-test container** builds the Docker image, starts it with a test API token, checks `/health`, and confirms that an authenticated `/api/status` request succeeds.

The container job waits for the validation job to pass. CI cancels an older run when a newer commit arrives for the same branch or pull request. A pull request is ready when the required checks pass and the review is complete.

Run the same combined checks locally with `pnpm ci:check` before requesting review. If Docker is not available, run `pnpm check` and the relevant Python and JSON checks, then note the limitation in the pull request.

## Development deployment helper

`scripts/push-live.sh` is available for testing Home Assistant integration changes on a configured remote Docker installation. It type-checks the project, copies the current working tree’s `custom_components/virtual_carillon` directory over SSH, restarts the target Home Assistant container, and waits for it to become healthy.

It reads `REMOTE_HOST` and `HA_CONTAINER` from a local ignored `dev.env` file. This is a development convenience, not a substitute for CI or the release process. Check the current branch, working tree, remote host, and target container before running it. It does not deploy the engine container or publish a release.

`scripts/reset-daily.sh` is another deployment helper. It clears Automatic-hymn history for today or a supplied date on the hosted engine. It is useful when testing selection repeatedly, but it changes persistent runtime state and should not be used casually on a shared installation.

## Releases

Release versions must agree in `package.json`, `custom_components/virtual_carillon/manifest.json`, `homeassistant/app/config.yaml`, and `Dockerfile`. Run:

```bash
pnpm release:check
```

The release process is:

1. Update the version files and `CHANGELOG.md` on a branch.
2. Run `pnpm ci:check`.
3. Merge the reviewed pull request into `main`.
4. Create and push a `v<version>` tag on the current `main` commit.

The publish workflow runs for `v*` tags only. It verifies that the tag points to the current `main` commit, reruns the checks, and publishes `linux/amd64` and `linux/arm64` Home Assistant app images to GitHub Container Registry. Release tags are immutable and must not be moved to another commit.

The release workflow does not deploy the live integration, publish an npm package, or replace a running installation. Live deployment remains an intentional, separately configured operation.

## Commit hygiene

Before committing, check:

```bash
git status
git diff --check
```

Do not commit `.env` or `dev.env` files, credentials, runtime data, private recordings, generated audio, `dist/`, `node_modules/`, Python bytecode, coverage output, or editor files. Keep test data disposable and avoid placing personal deployment details in examples.

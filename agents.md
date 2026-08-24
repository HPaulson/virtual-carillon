# Instructions for Future Agents

This repository is the Virtual Carillon project: a Linux-first Node.js/TypeScript bell engine with a Fastify API and Home Assistant custom integration.

Before changing code:

1. Read this file and [`doc/README.md`](doc/README.md).
2. Read the relevant design and operational document under `doc/`.
3. Inspect `git status` and preserve existing user changes.
4. Check the runtime with `node --version`, `pnpm --version`, and the host audio tools.

Important project facts:

- Use Node.js 22.5 or newer. The database uses the built-in `node:sqlite` API; do not reintroduce `better-sqlite3` without a deliberate compatibility decision.
- Use pnpm. The pinned package manager is recorded in `package.json`.
- The core application is TypeScript under `src/`; compile output goes to `dist/`.
- The main user interface is Home Assistant. The integration lives under `homeassistant/custom_components/virtual_carillon` and talks to the local HTTP API; it does not implement audio itself.
- Linux audio is discovered dynamically through PipeWire (`wpctl`/`pw-play`) with PulseAudio and `ffplay` fallbacks. Do not hard-code ALSA device names.
- Bluetooth pairing is a host concern. An Echo Show is treated as a generic Bluetooth/PipeWire sink; no Amazon API is required.
- SQLite and rendered audio are runtime data. The default native data directory is `.data`; Docker mounts `./data` to `/app/.data`. Do not delete these directories while diagnosing without explicit approval.
- The Docker deployment files are part of the supported path: `Dockerfile`, `compose.yaml`, and the Linux PipeWire override `compose.linux.yaml`.

Normal validation:

```bash
pnpm typecheck
pnpm build
pnpm test
pnpm lint
```

For runtime validation, run `node dist/cli/index.js doctor`, render with `test`, play `test-bell` or `westminster-quarter`, and exercise `/health`, `/api/status`, `/api/assets`, and `/api/schedules`. See [`doc/testing.md`](doc/testing.md) and [`doc/operations.md`](doc/operations.md).

Do not claim PipeWire, Bluetooth, or Echo Show success based only on a macOS test. Record the actual host and available output in the handoff. Keep scheduler failures isolated so a disconnected speaker cannot crash the engine.

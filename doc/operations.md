# Operations and Troubleshooting

## Docker deployment

### Publish changes and update Home Assistant

From the repository root, run the publish helper with an optional commit message:

```bash
./scripts/push-live.sh "Describe the change"
```

It typechecks the project, commits and pushes the current branch to GitHub, copies the complete Home Assistant custom integration to `your-ssh-host`, restarts Home Assistant, and waits for it to become healthy. The remote host, HA component path, and HA container name can be overridden with `REMOTE_HOST`, `HA_COMPONENT_PARENT`, and `HA_CONTAINER`.

Docker is the recommended Home Assistant deployment. The single Compose file runs the API, SQLite database, and rendered-audio cache. Home Assistant can configure routines and select media players; for API-only native playback, configure `outputs` (or no targets for the platform default) and the Node service evaluates and plays the schedule itself:

```bash
cp .env.example .env
docker compose up -d --build
docker compose ps
docker compose logs -f virtual-carillon
```

The database and rendered audio cache live in the `virtual-carillon-data` Docker volume. The container-local health endpoint is `http://127.0.0.1:9876/health`; services on the shared Docker network use `http://virtual-carillon:9876/health`.

For a remote or Dokploy deployment, set `VIRTUAL_CARILLON_API_TOKEN` in the server environment to a long random value and attach Home Assistant to the same Docker network. The default deployment does not publish a host port or require a public domain; all `/api/*` calls require the bearer token.

See [`docs/docker.md`](../docs/docker.md) for the Dokploy and Home Assistant deployment procedure. The container needs no host ALSA, PipeWire, PulseAudio, Bluetooth, or speaker-device access.

## Home Assistant URLs

- Same host/native engine: `http://127.0.0.1:9876`
- Same Compose network: `http://virtual-carillon:9876`
- Separate hosts: add an explicit private network path or reverse proxy only if needed; enter the matching API token in the HA config flow.
- Dokploy HA-first deployment: attach Home Assistant to the service's Docker network and use `http://virtual-carillon:9876` with the matching API token.

## Common failures

### A media player cannot play an asset

The engine can be healthy while the selected Home Assistant media player cannot fetch the audio URL. Confirm that the player can reach Home Assistant's configured internal or external URL, that the Virtual Carillon media source is available, and that the player supports `media_player.play_media`. Speaker pairing, Wi-Fi, Bluetooth, Chromecast, Sonos, and laptop audio are handled by the relevant Home Assistant integration.

The default Dokploy deployment does not use the server's local speakers. Direct CLI/API playback remains available for experiments, but it requires a separate native host-audio setup.

### Database locked

The engine uses WAL mode and a busy timeout. Avoid running multiple server instances against the same data directory. Stop stale processes before diagnosing; do not delete SQLite WAL/SHM files while another process is running.

### Cache or database reset

Rendered WAV and LitCal caches can be regenerated. The SQLite database contains playback event history. Use Dokploy's named-volume backup for `virtual-carillon-data` before replacing it.

Only remove runtime data when explicitly requested and after confirming the exact target.

# Operations and Troubleshooting

## Docker deployment

Docker is the recommended deployment. The single Compose file runs the API, SQLite database, and rendered-audio cache. Home Assistant owns scheduling, media-player selection, and playback:

```bash
cp .env.example .env
docker compose up -d --build
docker compose ps
docker compose logs -f virtual-carillon
```

The database and rendered audio cache live in the `virtual-carillon-data` Docker volume. The health endpoint is `http://127.0.0.1:9876/health`.

For a remote or Dokploy deployment, set `VIRTUAL_CARILLON_API_TOKEN` in the server environment to a long random value, then expose the service through an HTTPS domain. `/health` is public for health checks; all `/api/*` calls require the bearer token.

See [`docs/docker.md`](../docs/docker.md) for the Dokploy and Home Assistant deployment procedure. The container needs no host ALSA, PipeWire, PulseAudio, Bluetooth, or speaker-device access.

## Home Assistant URLs

- Same host/native engine: `http://127.0.0.1:9876`
- Same Compose network: `http://virtual-carillon:9876`
- Separate hosts: use the engine host's reachable address and firewall port 9876 appropriately; enter the matching API token in the HA config flow.
- Dokploy: use the HTTPS domain mapped to container port `9876`; enter the matching `VIRTUAL_CARILLON_API_TOKEN` in HA.

## Common failures

### A media player cannot play an asset

The engine can be healthy while the selected Home Assistant media player cannot fetch the audio URL. Confirm that the player can reach Home Assistant's configured internal or external URL, that the Virtual Carillon media source is available, and that the player supports `media_player.play_media`. Speaker pairing, Wi-Fi, Bluetooth, Chromecast, Sonos, and laptop audio are handled by the relevant Home Assistant integration.

The default Dokploy deployment does not use the server's local speakers. Direct CLI/API playback remains available for experiments, but it requires a separate native host-audio setup.

### Database locked

The engine uses WAL mode and a busy timeout. Avoid running multiple server instances against the same data directory. Stop stale processes before diagnosing; do not delete SQLite WAL/SHM files while another process is running.

### Cache or database reset

Rendered WAV and LitCal caches can be regenerated. The SQLite database contains playback event history. Use Dokploy's named-volume backup for `virtual-carillon-data` before replacing it.

Only remove runtime data when explicitly requested and after confirming the exact target.

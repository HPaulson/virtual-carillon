# Operations and Troubleshooting

## Docker deployment

Docker is the recommended deployment. The base Compose file runs the API, scheduler, SQLite database, and cache on any Docker host:

```bash
cp .env.example .env
docker compose up -d --build
docker compose ps
docker compose logs -f virtual-carillon
```

The data directory is `./data` on the host. The health endpoint is `http://127.0.0.1:9876/health`.

For Linux PipeWire/Bluetooth playback, use the override and expose the host user-session sockets:

```bash
HOST_XDG_RUNTIME_DIR="${XDG_RUNTIME_DIR:-/run/user/$(id -u)}" \
  docker compose -f compose.yaml -f compose.linux.yaml up -d --build
```

Pair the speaker on the host, not inside the container:

```bash
wpctl status
bluetoothctl devices Connected
```

The host user must have a live PipeWire session and the container must see `pipewire-0`. See [`docs/docker.md`](../docs/docker.md) for the full deployment procedure.

## Home Assistant URLs

- Same host/native engine: `http://127.0.0.1:9876`
- Same Compose network: `http://virtual-carillon:9876`
- Separate hosts: use the engine host's reachable address and firewall port 9876 appropriately.

## Common failures

### No outputs

Run `doctor` and `devices`. On Linux, check `wpctl status`, `pactl list short sinks`, and the PipeWire socket mount. On macOS, the intended development output is the CoreAudio default and Bluetooth status is reported unavailable.

### Bluetooth speaker disconnected

Bluetooth pairing and connection are host responsibilities. Reconnect it with the host's Bluetooth tools, then verify that it appears as a PipeWire sink. The scheduler catches playback errors and continues running; it does not currently guarantee automatic reconnection.

### Audio plays locally but not through Docker

Use `compose.linux.yaml`, set `HOST_XDG_RUNTIME_DIR` to the runtime directory of the logged-in audio user, and verify socket permissions. Do not install a second Bluetooth daemon in the container.

### Database locked

The engine uses WAL mode and a busy timeout. Avoid running multiple server instances against the same data directory. Stop stale processes before diagnosing; do not delete SQLite WAL/SHM files while another process is running.

### Cache or database reset

Rendered WAV cache can be regenerated. The SQLite database contains schedules and event history. Back it up before replacing it:

```bash
cp data/carillon.sqlite data/carillon.sqlite.backup
```

Only remove runtime data when explicitly requested and after confirming the exact target.

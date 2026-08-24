# Docker deployment

Docker is the recommended deployment on every host. The container owns the Node.js engine and its SQLite/cache data. The base Compose file has no Linux host mounts, so it runs on Linux, macOS, Windows, Docker Desktop, and other Docker-compatible systems. Audio transport is selected separately according to the host.

The engine itself always runs in the Linux container. Host-specific audio integration is an optional deployment adapter, not a requirement of the application.

## 1. Start the portable container

```bash
cp .env.example .env
docker compose up -d --build
docker compose ps
```

This starts the API, scheduler, SQLite database, and cached rendering on any Docker host. Rendered WAV audio is available at:

```text
http://127.0.0.1:9876/api/assets/test-bell/audio
```

Home Assistant or another network-capable media player can consume that URL on hosts where Docker cannot access native audio hardware directly.

## 2. Linux PipeWire/Bluetooth audio

Only Linux hosts with a user PipeWire session should use the audio override.

Pair and connect the Echo Show or another speaker on the Linux host. Confirm the sink is visible before starting the container:

```bash
wpctl status
bluetoothctl devices Connected
echo "$XDG_RUNTIME_DIR"
```

The host needs PipeWire's user session and the `pipewire-0` socket. Keep the audio user logged in for unattended desktop-session audio. Set `HOST_XDG_RUNTIME_DIR` in `.env` if the runtime directory is not `/run/user/1000`.

### Start Virtual Carillon

```bash
cp .env.example .env
HOST_XDG_RUNTIME_DIR="${XDG_RUNTIME_DIR:-/run/user/$(id -u)}" \
  docker compose -f compose.yaml -f compose.linux.yaml up -d --build
docker compose -f compose.yaml -f compose.linux.yaml ps
docker compose -f compose.yaml -f compose.linux.yaml logs -f virtual-carillon
```

The API is available at `http://127.0.0.1:9876`. The persistent database and rendered audio cache live in `./data`.

### Test audio

```bash
docker compose -f compose.yaml -f compose.linux.yaml exec virtual-carillon node dist/cli/index.js doctor
docker compose -f compose.yaml -f compose.linux.yaml exec virtual-carillon node dist/cli/index.js devices
docker compose -f compose.yaml -f compose.linux.yaml exec virtual-carillon node dist/cli/index.js play test-bell
docker compose -f compose.yaml -f compose.linux.yaml exec virtual-carillon node dist/cli/index.js play westminster-quarter
```

If the Linux override reports no outputs, first verify `wpctl status` on the host, then verify that `.env` points to the same user's `XDG_RUNTIME_DIR`. Do not install a second Bluetooth daemon in the container.

Useful container-side checks:

```bash
docker compose -f compose.yaml -f compose.linux.yaml exec virtual-carillon \
  sh -lc 'ls -l /run/user/1000/pipewire-0 && wpctl status'
docker compose -f compose.yaml -f compose.linux.yaml exec virtual-carillon \
  node dist/cli/index.js doctor
```

If `pipewire-0` is missing, the Linux override was not used or `HOST_XDG_RUNTIME_DIR` points to the wrong host directory. If the socket exists but `wpctl status` fails, check host socket permissions and that the host PipeWire user session is running.

## macOS and Windows

Use the base `compose.yaml` without `compose.linux.yaml`. Docker Desktop runs the engine and API normally, but it does not expose the host's CoreAudio, WASAPI, or native Bluetooth sink as a PipeWire device. Use the HTTP audio endpoint with Home Assistant, a network media player, or a future host-output adapter. No Linux filesystem path or Bluetooth command is required for the container to start.

## Home Assistant

When Home Assistant runs on the same host, add the integration with `http://127.0.0.1:9876`. When Home Assistant is another container on the same Compose network, use `http://virtual-carillon:9876`; otherwise use the host's reachable address.

For a production deployment, pin the image tag or build from a release commit, back up `./data`, and restrict port 9876 at the host firewall if it should not be reachable from the LAN.

# Home Assistant Container with Docker

This is installation path 2 from the [main guide](../README.md#2-home-assistant-container-with-docker). Use it when Home Assistant runs in a Docker container. It is not the Home Assistant OS or Supervised app installation.

Virtual Carillon’s container renders and serves audio. Home Assistant’s integration sends that audio to the media players you select, so the engine container does not need access to ALSA, PipeWire, PulseAudio, Bluetooth, or the speaker hardware.

## Installation

Use the [main README](../README.md#2-home-assistant-container-with-docker) for the complete Docker installation: creating `.env`, starting the container, connecting Home Assistant to its network, installing the integration, and adding the device. This page is deliberately limited to Docker-specific storage and troubleshooting details.

The supplied Compose file creates the `virtual-carillon_default` network and keeps port `9876` inside that network. It does not publish the API to the Docker host. The integration address is `http://virtual-carillon:9876` when Home Assistant is attached to that network.

Do not expose the API to the public internet. If you need remote access, place it behind a properly configured reverse proxy and keep the bearer token secret.

## Persistent data and backups

The `virtual-carillon-data` Docker volume holds the engine’s persistent state:

- `carillon.sqlite` — schedules, schedule claims, and playback history;
- rendered WAV files;
- LitCal cache files; and
- imported recordings and their library index.

Back up the volume before removing or recreating it. You may replace the container image without losing this data as long as the volume remains in place.

## Troubleshooting

### Home Assistant cannot connect

Check the following in order:

1. The `virtual-carillon` container is running: `docker compose ps`.
2. Home Assistant and the engine share a Docker network.
3. The integration uses `http://virtual-carillon:9876`, not the Docker host’s `localhost:9876`.
4. The API token matches exactly.

From a container on the shared network, these requests should succeed:

```bash
curl http://virtual-carillon:9876/health
curl -H 'Authorization: Bearer YOUR_TOKEN' http://virtual-carillon:9876/api/status
```

### A media player does not play an asset

The engine can be healthy while a particular speaker cannot retrieve the audio. Confirm that the speaker can reach Home Assistant’s configured internal or external URL and that its integration supports `media_player.play_media`. Pairing, network access, and speaker-specific playback remain the responsibility of that media-player integration.

### I want direct audio from the container

The standard Compose setup is deliberately Home Assistant–first and does not mount host audio devices. The CLI and `POST /api/play` support direct host-output playback in a separate native setup, but that is not part of this Docker configuration.

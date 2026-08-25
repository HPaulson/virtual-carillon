# Docker deployment

The container renders and serves audio; Home Assistant owns output selection. The deployment does not mount ALSA, PipeWire, PulseAudio, Bluetooth, or other host speaker devices. Any media player already supported by Home Assistant can play Virtual Carillon audio.

## Start the container

Copy `.env.example` to `.env` and set a long random API token:

```bash
cp .env.example .env
openssl rand -hex 32
docker compose up -d --build
docker compose ps
```

The API listens on port `9876` inside the container. The default Compose deployment does not publish that port to the host; Home Assistant connects over the shared Docker network. Docker Compose refuses to start until `VIRTUAL_CARILLON_API_TOKEN` is set. `/health` is available to attached containers for health checks, and `/api/*` requires `Authorization: Bearer <VIRTUAL_CARILLON_API_TOKEN>`.

The SQLite database and rendered audio cache live in the `virtual-carillon-data` Docker volume. Enable backups for that volume in production.

Keep the default deployment HA-first: attach Home Assistant to the same Docker network as `virtual-carillon`, then configure the integration with `http://virtual-carillon:9876` and the same API token. Do not add a host port or public domain unless external access is intentionally required. Users who need that behavior can add a `ports` mapping or reverse proxy as a deployment-specific override.

The API token protects the engine API. The Home Assistant media proxy intentionally exposes only rendered audio at `/api/virtual_carillon/audio/<asset>` without a separate device token, because network media players need to fetch the URL. Keep Home Assistant and its media players on the appropriate trusted network.

## Home Assistant

Install the custom component from `homeassistant/custom_components/virtual_carillon` into `/config/custom_components/virtual_carillon`, restart Home Assistant, and add **Virtual Carillon** from Settings → Devices & services. Enter the service URL and the same API token.

The integration adds a **Virtual Carillon** media source to Home Assistant's media browser. Browse assets or hymns, choose an asset, and select any compatible Home Assistant media player. It also adds target-based actions and an integration-owned schedule. Open the integration's **Configure** flow to set Westminster once, then add as many “play asset or Liturgical Hymn at...” schedules as needed, with multiple exact times, days, allowed-time windows, and media-player targets.

```yaml
service: virtual_carillon.play
target:
  entity_id:
    - media_player.kitchen
    - media_player.office
data:
  asset: test-bell
```

```yaml
service: virtual_carillon.select_hymn
target:
  entity_id: media_player.kitchen
data:
  strategy: random
```

Virtual Carillon does not configure the selected media player. Wi-Fi speakers, Bluetooth speakers, Chromecast, Sonos, laptop audio, or any other output are the responsibility of the corresponding Home Assistant integration.

Copy `homeassistant/blueprints/automation/virtual_carillon/scheduled_routine.yaml` to `/config/blueprints/automation/virtual_carillon/` only when an advanced custom automation is needed. The standard routine list does not require separate HA automations. The complete mapping is documented in [`doc/home-assistant.md`](../doc/home-assistant.md).

## Troubleshooting

### Home Assistant cannot connect

Check the shared Docker network, URL, and token. The default deployment is not reachable through the host's `localhost:9876`. From a container attached to the shared network, test:

```bash
curl http://virtual-carillon:9876/health
curl -H "Authorization: Bearer $VIRTUAL_CARILLON_API_TOKEN" http://virtual-carillon:9876/api/assets
```

### A media player cannot play an asset

The engine may be healthy while the selected player cannot fetch the audio URL. Confirm that the player can reach Home Assistant's configured internal/external URL and that the player supports `media_player.play_media`. The engine container itself does not need to see the speaker.

### Direct engine playback

The CLI and `/api/play` endpoint remain available for native-output experiments, but they are not part of the default Docker/Home Assistant deployment. They require a separate host audio setup and are intentionally outside the HA-native path.

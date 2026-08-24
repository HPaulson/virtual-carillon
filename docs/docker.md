# Docker and Dokploy deployment

The container renders and serves audio; Home Assistant owns output selection. The deployment does not mount ALSA, PipeWire, PulseAudio, Bluetooth, or other host speaker devices. Any media player already supported by Home Assistant can play Virtual Carillon audio.

## Start the container

Copy `.env.example` to `.env` and set a long random API token:

```bash
cp .env.example .env
openssl rand -hex 32
docker compose up -d --build
docker compose ps
```

The API listens on port 9876. `/health` is public for container health checks; `/api/*` requires `Authorization: Bearer <VIRTUAL_CARILLON_API_TOKEN>` when a token is configured.

The SQLite database and rendered audio cache live in the `virtual-carillon-data` Docker volume. Enable backups for that volume in production.

## Dokploy

1. Push this repository to the Git provider available to Dokploy.
2. Create a **Docker Compose** service, not a Docker Stack service.
3. Select the repository and branch, then set **Compose Path** to `./compose.yaml`.
4. Add the values from [`.env.example`](../.env.example) in Dokploy's Environment tab. Dokploy writes them to the `.env` file consumed by `env_file: .env`.
5. Set `VIRTUAL_CARILLON_API_TOKEN` to a secret value. Home Assistant automations own scheduling and output selection.
6. Deploy and confirm the health check is green.

Add a Dokploy domain for service `virtual-carillon` and container port `9876`, preferably with HTTPS. Home Assistant should use that domain and the same API token. The published port also allows a trusted-LAN URL such as `http://<server-lan-ip>:9876`.

The API token protects the engine API. The Home Assistant media proxy intentionally exposes only rendered audio at `/api/virtual_carillon/audio/<asset>` without a separate device token, because network media players need to fetch the URL. Keep Home Assistant and the Dokploy domain on a trusted LAN, VPN, or other access-controlled network.

## Home Assistant

Install the custom component from `homeassistant/custom_components/virtual_carillon` into `/config/custom_components/virtual_carillon`, restart Home Assistant, and add **Virtual Carillon** from Settings → Devices & services. Enter the Dokploy URL and the same API token.

The integration adds a **Virtual Carillon** media source to Home Assistant's media browser. Browse assets or hymns, choose an asset, and select any compatible Home Assistant media player. It also adds target-based actions and supports complete HA-owned schedules through automations or the included scheduled-routine blueprint:

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
  fallback_asset: ave-maris-stella
```

Virtual Carillon does not configure the selected media player. Wi-Fi speakers, Bluetooth speakers, Chromecast, Sonos, laptop audio, or any other output are the responsibility of the corresponding Home Assistant integration.

Copy `homeassistant/blueprints/automation/virtual_carillon/scheduled_routine.yaml` to `/config/blueprints/automation/virtual_carillon/` to configure exact-time, hourly, 15-minute, or 30-minute routines with weekdays, exclusions, ordered actions, delays, LitCal filters, and media-player targets in the Home Assistant UI. The automation enabled toggle is the schedule enabled toggle. The complete mapping is documented in [`doc/home-assistant.md`](../doc/home-assistant.md).

## Troubleshooting

### Home Assistant cannot connect

Check the URL and token. Test the public health endpoint and authenticated API separately:

```bash
curl https://bells.example.com/health
curl -H "Authorization: Bearer $VIRTUAL_CARILLON_API_TOKEN" https://bells.example.com/api/assets
```

### A media player cannot play an asset

The engine may be healthy while the selected player cannot fetch the audio URL. Confirm that the player can reach Home Assistant's configured internal/external URL and that the player supports `media_player.play_media`. The engine container itself does not need to see the speaker.

### Direct engine playback

The CLI and `/api/play` endpoint remain available for native-output experiments, but they are not part of the default Dokploy/HA deployment. They require a separate host audio setup and are intentionally outside the HA-native path.

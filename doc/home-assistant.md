# Home Assistant Integration

The custom component is in `homeassistant/custom_components/virtual_carillon`. It communicates with the Node engine over HTTP and exposes a config flow, a coordinator polling `/api/status`, `/api/assets`, `/api/hymns`, and today's LitCal day every 30 seconds, a status sensor, a browsable Home Assistant media source, and `virtual_carillon.play`, `virtual_carillon.select_hymn`, and `virtual_carillon.stop` actions.

## Install

Copy the component directory into:

```text
/config/custom_components/virtual_carillon/
```

Start the engine, then add **Virtual Carillon** through Settings → Devices & services. In the HA-first Docker deployment, use `http://virtual-carillon:9876`; Home Assistant must be attached to the same Docker network as the engine. The Compose service is not published on a host or LAN port. Enter the same API token configured as `VIRTUAL_CARILLON_API_TOKEN` on the server; leave it blank only when API authentication is intentionally disabled.

The config flow verifies the token against `/api/status` and stores it in the Home Assistant config entry. All integration requests send it as `Authorization: Bearer …`; the token is not part of the URL.

The setup flow asks whether to use LitCal and which calendar to use. These settings can be changed later from the integration's Options flow; they are Home Assistant configuration, not server environment variables.

## Service examples

```yaml
service: virtual_carillon.play
target:
  entity_id:
    - media_player.kitchen
    - media_player.office
data:
  asset: angelus
```

```yaml
service: virtual_carillon.stop
target:
  entity_id: media_player.kitchen
```

Automatic selection uses the highest-priority LitCal celebration and the catalog's exact-feast → exact-saint → saint/category → season → General fallback:

```yaml
service: virtual_carillon.select_hymn
target:
  entity_id: media_player.kitchen
data:
  strategy: random
  fallback_asset: ave-maris-stella
```

Overrides can select a fixed hymn or a tagged collection. Stable IDs are used for categories and feasts:

```yaml
service: virtual_carillon.select_hymn
target:
  entity_id: media_player.kitchen
data:
  strategy: random
  category_ids: [marian]
  offices: [vespers]
```

The **Virtual Carillon** media source appears in Home Assistant's media browser. Browse all assets or hymns, then choose any media player supported by Home Assistant. For a Liturgical Hymn schedule, **Automatic hymn hour** can be left unfiltered or set to Matins, Lauds, Daytime, Vespers, or Compline. The hour-specific choices first prefer historically tagged hymns, then fall back through the normal feast/category/season matching when no office-tagged candidate exists. The integration proxies rendered audio through Home Assistant, so the Node container does not need PipeWire, ALSA, Bluetooth, or speaker access.

The status sensor's `hymns` attribute exposes each hymn's `liturgicalTags` fields for dashboards and selectors, including categories, feasts, seasons, offices, and canonical hours.

## Schedule configuration

The normal schedule is configured once inside the **Virtual Carillon** integration and stored by the Node service in SQLite. Home Assistant supplies the media-player targets and remains responsible for actual playback; it does not need one automation per bell event.

Open **Settings → Devices & services → Virtual Carillon → Configure**. The schedule editor has two simple building blocks:

- **Westminster** — enable it, choose every 15 minutes, every 30 minutes, or hourly, then choose days, a daily time window, and media players. The quarter chimes and the correct 1–12 hour strike count are selected automatically.
- **Add a manual or automatic schedule** — choose **Manual** to select one specific asset or hymn, or **Automatic** to let LitCal choose the hymn. Automatic mode defaults to the normal selection and can optionally be limited to a specific canonical hour. Enter one or more exact times such as `12:00, 18:00`, choose days, optionally set Never before/Never after, and choose media players. Add as many of these schedules as needed.

This supports Angelus at both noon and 18:00 on only Mondays and Wednesdays as one schedule, or any other combination, without YAML or one automation per event. Automatic mode uses the current LitCal season and feast context and the engine's built-in hymn selection logic; it does not require a backup asset. The configured list is saved through the public semantic `/api/schedule` endpoint and survives container restarts. The same schedule can be configured by API clients; HA simply supplies `media_player` targets when speakers are managed by Home Assistant.

Virtual Carillon does not configure or control the user's speaker integrations. Any Wi-Fi, Bluetooth, Chromecast, Sonos, laptop, or other media player recognized by Home Assistant can be targeted through normal Home Assistant media-player actions.

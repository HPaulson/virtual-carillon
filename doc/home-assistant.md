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

Automatic selection uses the highest-priority LitCal celebration and the catalog's exact-feast → category → season → General fallback:

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

The **Virtual Carillon** media source appears in Home Assistant's media browser. Browse all assets or hymns, then choose any media player supported by Home Assistant. The integration proxies rendered audio through Home Assistant, so the Node container does not need PipeWire, ALSA, Bluetooth, or speaker access.

The status sensor's `hymns` attribute exposes each hymn's `liturgicalTags` fields for dashboards and selectors, including categories, feasts, seasons, offices, and canonical hours.

## Schedule configuration

The normal schedule is configured once inside the **Virtual Carillon** integration and stored by the Node service in SQLite. Home Assistant supplies the media-player targets and remains responsible for actual playback; it does not need one automation per bell event.

Open **Settings → Devices & services → Virtual Carillon → Configure**. The schedule editor lets you:

- enable or disable the schedule and LitCal;
- add any number of named routines;
- run a routine at an exact time, hourly, every 15 minutes, or every 30 minutes;
- select weekdays, excluded times, and an optional allowed-time window for each routine (for example, weekdays but never before 06:00 or after 22:00);
- add ordered actions to each routine: play any asset, select a seasonal hymn, or wait for a configurable delay;
- choose one or more Home Assistant `media_player` entities for every playback action;
- edit or remove routines later without writing YAML automations.

This supports Westminster, Angelus, hymns, Divine Office signals, user recordings, and arbitrary combinations without baking a particular household's schedule into the application. The configured list is saved through `/api/schedule` and survives container restarts. At each due minute the server evaluates all matching routines, resolves hymn selection, and returns one ordered sequence for the HA integration to play.

For example, a user can create separate routines for quarter chimes, an hourly hour-strike asset, Angelus at 12:00, Angelus at 18:00, and a 15:00 seasonal hymn. Each can target a different media player or player group and can be limited to a daily time window. Overnight windows such as 22:00–06:00 are supported. The included blueprint remains available for advanced automations that need conditions beyond the editor.

Virtual Carillon does not configure or control the user's speaker integrations. Any Wi-Fi, Bluetooth, Chromecast, Sonos, laptop, or other media player recognized by Home Assistant can be targeted through normal Home Assistant media-player actions.

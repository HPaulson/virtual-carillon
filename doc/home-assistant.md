# Home Assistant Integration

The custom component is in `homeassistant/custom_components/virtual_carillon`. It communicates with the Node engine over HTTP and exposes a config flow, a coordinator polling `/api/status`, `/api/assets`, `/api/hymns`, and today's LitCal day every 30 seconds, a status sensor, a browsable Home Assistant media source, and `virtual_carillon.play`, `virtual_carillon.select_hymn`, and `virtual_carillon.stop` actions.

## Install

Copy the component directory into:

```text
/config/custom_components/virtual_carillon/
```

Start the engine, then add **Virtual Carillon** through Settings → Devices & services. Use `http://127.0.0.1:9876` when both run on the same host, `http://virtual-carillon:9876` only when Home Assistant is on the same Compose network, or the Dokploy HTTPS domain (recommended) / published LAN address when the engine is deployed through Dokploy. Enter the same API token configured as `VIRTUAL_CARILLON_API_TOKEN` on the server; leave it blank only when API authentication is intentionally disabled.

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

## HA-native schedules

Home Assistant owns every schedule: enabled state, timing, conditions, ordered actions, delays, and media-player targets. The Node service has no schedule database or schedule runner.

Home Assistant's automation editor and Schedule helper are the schedule UI. The Schedule helper creates weekly time blocks that can trigger automations; ordinary automations can also use exact times, time patterns, calendar events, sun events, or any other Home Assistant trigger. See the [Schedule helper documentation](https://www.home-assistant.io/integrations/schedule/) and [automation trigger documentation](https://www.home-assistant.io/docs/automation/trigger/).

Copy the repository blueprint from `homeassistant/blueprints/automation/virtual_carillon/scheduled_routine.yaml` to `/config/blueprints/automation/virtual_carillon/`. Then go to Settings → Automations & scenes → Blueprints → **Virtual Carillon scheduled routine** → Create automation. The blueprint exposes exact time, hourly, every-15-minute, every-30-minute, weekdays, excluded times, and an ordered Home Assistant action sequence. The automation's enabled toggle controls whether the routine runs.

The action editor can configure every routine step:

- `virtual_carillon.play` selects a fixed asset and one or more media players.
- `virtual_carillon.select_hymn` supports fixed, random, and sequential selection; fixed assets; dates; seasons; ranks; feasts; categories; offices; canonical hours; tags; deterministic seeds; recent-selection exclusion; and fallback assets.
- Native `delay` actions and action sequence order are fully managed by Home Assistant.
- Automation name, alias, ID, enabled state, conditions, run mode, and targets are all managed by Home Assistant.

Example multi-step routine:

```yaml
alias: Noon hour and seasonal hymn
mode: queued
triggers:
  - trigger: time
    at: "12:00:00"
conditions:
  - condition: time
    weekday: [sun, mon, tue, wed, thu, fri, sat]
actions:
  - action: virtual_carillon.play
    target:
      entity_id: media_player.kitchen
    data:
      asset: westminster-hour
  - delay: "00:00:05"
  - action: virtual_carillon.select_hymn
    target:
      entity_id:
        - media_player.kitchen
        - media_player.office
    data:
      strategy: random
      fallback_asset: ave-maris-stella
```

An advanced LitCal-filtered step can be configured without editing the engine:

```yaml
action: virtual_carillon.select_hymn
target:
  entity_id: media_player.kitchen
data:
  strategy: random
  fallback_asset: ave-maris-stella
  seasons: [advent]
  rank: solemnity
  feast_ids: [assumption-of-mary]
  category_ids: [marian]
  offices: [vespers]
  canonical_hours: [vespers]
  recent_exclusion: 3
```

For an hourly routine that should skip noon, add `12:00` to the blueprint's **Excluded times**, or add a time condition/template condition to a normal automation. This is configured entirely in Home Assistant.

Virtual Carillon does not configure or control the user's speaker integrations. Any Wi-Fi, Bluetooth, Chromecast, Sonos, laptop, or other media player recognized by Home Assistant can be targeted through normal Home Assistant media-player actions.

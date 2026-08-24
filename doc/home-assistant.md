# Home Assistant Integration

The custom component is in `homeassistant/custom_components/virtual_carillon`. It communicates with the Node engine over HTTP and exposes a config flow, a coordinator polling `/api/status`, `/api/assets`, `/api/hymns`, and today's LitCal day every 30 seconds, a media player, a status sensor, and `virtual_carillon.play`, `virtual_carillon.select_hymn`, and `virtual_carillon.stop` services.

## Install

Copy the component directory into:

```text
/config/custom_components/virtual_carillon/
```

Start the engine, then add **Virtual Carillon** through Settings → Devices & services. Use `http://127.0.0.1:9876` when both run on the same host, or `http://virtual-carillon:9876` on the same Compose network.

## Service examples

```yaml
service: virtual_carillon.play
data:
  asset: angelus
  output: Echo Show
```

```yaml
service: virtual_carillon.stop
```

Automatic selection uses the highest-priority LitCal celebration and the catalog's exact-feast → category → season → General fallback:

```yaml
service: virtual_carillon.select_hymn
data:
  strategy: automatic
  output: Echo Show
```

Overrides can select a fixed hymn or a tagged collection. Stable IDs are used for categories and feasts:

```yaml
service: virtual_carillon.select_hymn
data:
  strategy: random
  category: marian
  office: vespers
```

The status sensor's `hymns` attribute exposes each hymn's `liturgicalTags` fields for dashboards and selectors, including categories, feasts, seasons, offices, canonical hours, language, rite, and tradition.

For schedule editing, use Home Assistant automations or call the Node schedule API from a dashboard/automation. The current integration does not yet provide a full native schedule editor.

Home Assistant does not pair Bluetooth devices or render audio. Pair/connect the speaker on the Linux host, confirm its PipeWire sink, and configure the output ID/name in the service or schedule payload.

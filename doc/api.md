# HTTP API

The server defaults to `http://127.0.0.1:9876`. CORS is enabled for local Home Assistant/dashboard use.

## Health and devices

- `GET /health` returns `{ ok, service, platform, arch, node, hostname }`.
- `GET /api/status` returns scheduler state, the default outdoor distance profile, outputs, Bluetooth diagnostics, and recent events.
- `GET /api/devices` returns outputs and Bluetooth diagnostics without event history.

An output has `id`, `name`, `kind`, `available`, and optional `description`. Linux sinks whose names contain `blue`, `echo`, or `bluetooth` are classified as Bluetooth.

## Assets and audio

- `GET /api/assets` returns built-in and imported assets with type/source/tags/provenance and, where supplied, `liturgicalTags` metadata.
- `GET /api/assets/:asset/audio` renders/caches and returns a WAV file.
- `POST /api/assets/import` registers a local recording. JSON requires `name` and `sourcePath`; optional fields include `id`, `type`, `license`, `attribution`, `sourceUrl`, `tags`, `liturgicalSeasons`, `feastTypes`, and a stable-ID `liturgicalTags` object.
- `DELETE /api/assets/:asset` removes a user asset; bundled assets cannot be removed.
- `GET /api/liturgical/:date` returns the cached LitCal day when the optional integration is enabled.

## Hymn catalog and selection

- `GET /api/hymns` lists hymns and their complete `liturgicalTags`. Filter with `feast`/`feastIds`, `category`/`categoryIds`, `season`/`seasonIds`, `office`/`officeIds`, `canonicalHours`, `language`, `rite`, `tradition`, or `tag`.
- `GET /api/hymns/:hymn` returns one hymn's metadata.
- `GET /api/liturgical/:date/hymn` returns the normalized LitCal day and the automatic selection.
- `POST /api/hymns/select` selects from a date's calendar context. Its body accepts `date`, the same tag filters, `strategy` (`random`, `sequential`, or `fixed`), `fixedAssetId`, `seed`, and `recentExclusion`.

For an automatic selection, the catalog uses LitCal's highest-priority celebration, exact feast matches, broader category matches, season matches, and General fallback in that order. A supplied category or feast acts as an override query while retaining the same fallback shape. Seeded random selection is stateless and reproducible; unseeded random selection avoids the recent window when alternatives exist.

Current stable asset IDs include `test-bell`, distinct clock/tower/carillon bells, `westminster-quarter`, `westminster-half`, `westminster-three-quarter`, `westminster-hour` and `westminster-hour-1` through `westminster-hour-12`, `angelus`, `angelus-rome`, four Divine Office signals, and thirty-nine source-backed hymn arrangements. See `src/library/hymns.ts` for the complete stable ID list and provenance URLs.

## Playback

`POST /api/play`

```json
{ "asset": "test-bell", "output": "optional output id or name", "distance": "half-mile" }
```

`distance` accepts `near`, `church-grounds`, `quarter-mile`, `half-mile`, `one-mile`, or `custom`. A custom request may include partial `customDistance` settings such as `highCutHz`, `gain`, `attackGain`, `reflectionMix`, `reflectionDelays`, `reflectionGains`, and `stereoSpread`. The default is `half-mile`.

Returns `{ ok, filePath, command }` on success. Invalid request bodies return `400`; unknown assets or unavailable playback return `503` and are recorded in the event table.

`POST /api/stop` stops tracked active playback and returns `{ ok: true }`.

## Schedules

- `GET /api/schedules` returns persisted schedule entries.
- `PUT /api/schedules` replaces the full schedule list.

An optional `liturgical` object can contain stable-ID arrays `seasons`, `feastIds`, `categoryIds`, `offices`, and `canonicalHours`, plus `language`, `rite`, `tradition`, `strategy`, `fixedAssetId`, `seed`, and `recentExclusion`. Legacy singular `season`, `feast`, `hymnTag`, and `rotation` fields remain accepted. The default strategy is `random`. If LitCal is disabled or unavailable, the schedule's ordinary `asset` remains the fallback.

```json
{
  "id": "angelus-noon",
  "name": "Angelus at noon",
  "enabled": true,
  "days": [0, 1, 2, 3, 4, 5, 6],
  "time": "12:00",
  "asset": "angelus",
  "output": "optional output id or name"
}
```

Days use JavaScript weekday numbers: Sunday `0` through Saturday `6`. Supported time forms are exact `HH:MM`, `hourly`, `*/15`, and `*/30`. The PUT endpoint replaces all entries, so clients should GET, modify, and PUT the complete list.

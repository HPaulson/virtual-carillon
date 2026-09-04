# HTTP API

This reference is for custom integrations and advanced local setups. Most Home Assistant users should use the integration rather than call these endpoints directly. The API can identify native outputs, but it does not configure audio drivers, Bluetooth, or particular speaker hardware.

By default, the server listens at `http://127.0.0.1:9876`. When `VIRTUAL_CARILLON_API_TOKEN` is set, every `/api/*` endpoint requires:

```http
Authorization: Bearer <token>
```

`GET /health` is the exception: it is always unauthenticated for container health checks. If no API token is configured, `/api/*` endpoints are also unauthenticated; do not use that arrangement on a networked deployment.

## Status and output devices

| Endpoint           | Response                                                                                          |
| ------------------ | ------------------------------------------------------------------------------------------------- |
| `GET /health`      | Service, platform, architecture, Node.js version, and `ok: true`.                                 |
| `GET /api/status`  | Default distance profile, discovered outputs, Bluetooth diagnostics, and up to ten recent events. |
| `GET /api/devices` | Discovered outputs and Bluetooth diagnostics, without event history.                              |

An output ID or name returned by `/api/devices` may be used as `output` in a direct playback request or in an API-managed schedule.

## Assets and audio

| Endpoint                       | Response or action                                                                               |
| ------------------------------ | ------------------------------------------------------------------------------------------------ |
| `GET /api/assets`              | Lists bundled and imported assets.                                                               |
| `GET /api/assets/:asset/audio` | Renders, caches, and returns the named asset as audio. HTTP byte ranges are supported.           |
| `POST /api/assets/import`      | Copies a local recording into the engine’s data directory and adds it to the persistent library. |
| `DELETE /api/assets/:asset`    | Removes an imported asset and its copied file. Bundled assets cannot be removed.                 |

`GET /api/assets/:asset/audio` accepts one optional query parameter:

| Parameter  | Values                                                            | Default                              |
| ---------- | ----------------------------------------------------------------- | ------------------------------------ |
| `distance` | `near`, `church-grounds`, `quarter-mile`, `half-mile`, `one-mile` | Engine default, normally `half-mile` |

The audio endpoint does not accept `custom` distance settings.

### Import a recording

The request body must include `name` and `sourcePath`. `sourcePath` is a path on the machine or container where the engine runs, not on the client making the request. The engine copies the source file into its data directory.

```json
{
  "name": "Custom Angelus",
  "sourcePath": "/srv/audio/custom-angelus.wav",
  "id": "custom-angelus",
  "type": "recording",
  "tags": ["Angelus"],
  "liturgicalTags": {
    "categories": ["marian"],
    "seasons": ["easter"]
  }
}
```

`id` is optional; if omitted, the file name becomes the asset ID after normalization. `type` is `recording` or `hymn` and defaults to `recording`. Optional `tags`, `liturgicalSeasons`, `feastTypes`, and `liturgicalTags` are stored with the asset. The supported source extensions are `.wav`, `.flac`, `.mp3`, `.ogg`, `.m4a`, and `.aac`.

Import only recordings that you have the right to copy and use. The engine does not transcode or publish them.

## LitCal and hymn selection

| Endpoint                                          | Response or action                                                                |
| ------------------------------------------------- | --------------------------------------------------------------------------------- |
| `GET /api/liturgical/:date?calendar=general`      | Returns the normalized LitCal day for `general`, `US`, `IT`, `NL`, `VA`, or `CA`. |
| `GET /api/liturgical/:date/hymn?calendar=general` | Returns the day and an automatic hymn selection.                                  |
| `GET /api/hymns`                                  | Lists hymn metadata.                                                              |
| `GET /api/hymns/:hymn`                            | Returns metadata for one hymn.                                                    |
| `POST /api/hymns/select`                          | Selects a hymn for a date and optional conditions. It does not start playback.    |
| `POST /api/hymns/reset-day`                       | Clears the completed-hymn history for one local date.                             |

`GET /api/hymns` accepts comma-separated or repeated `feastIds`, `categoryIds`, `seasonIds`, `officeIds`, and `canonicalHours` query parameters. These are all filters on the returned list. For example:

```text
/api/hymns?categoryIds=marian&seasonIds=easter
```

### `POST /api/hymns/select`

The request body accepts these fields:

| Field             | Default             | Meaning                                                                                                                                                                            |
| ----------------- | ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `date`            | Server’s local date | Date to evaluate in `YYYY-MM-DD` form.                                                                                                                                             |
| `useLitCal`       | `true`              | Uses LitCal for the selected date. Set `false` only for a direct API request that deliberately needs a neutral general context; the Home Assistant integration always uses LitCal. |
| `calendar`        | `general`           | LitCal calendar: `general`, `US`, `IT`, `NL`, `VA`, or `CA`.                                                                                                                       |
| `seasons`         | —                   | Requires the evaluated day to match one of these seasons and restricts candidates to them.                                                                                         |
| `rank`            | —                   | Requires the evaluated day to have this rank. Common IDs include `solemnity`, `feast`, and `memorial`.                                                                             |
| `feastIds`        | —                   | Requires the evaluated day to match one of these feast IDs and restricts candidates to them.                                                                                       |
| `categoryIds`     | —                   | Restricts candidates to these hymn categories. It does not require the calendar day to share the category.                                                                         |
| `offices`         | —                   | Restricts candidates to their Office metadata.                                                                                                                                     |
| `canonicalHours`  | —                   | Prefers the listed Liturgy of the Hours contexts while selecting. It is not a hard candidate filter in this endpoint.                                                              |
| `strategy`        | `random`            | `fixed`, `random`, or `sequential`; see below.                                                                                                                                     |
| `fixedAssetId`    | —                   | Exact hymn ID for `fixed` selection. When present, it bypasses automatic scoring if the hymn is otherwise eligible.                                                                |
| `seed`            | —                   | Gives reproducible random selection for the same date and request where a random choice is made.                                                                                   |
| `recentExclusion` | —                   | Number of recent unseeded selections to avoid for non-automatic selection. `0` permits an immediate repeat.                                                                        |

When the request has no explicit feast, category, or season filter, the engine performs automatic scoring. A direct feast match is strongest, followed by a saint match, category match, and season match. A requested canonical hour can favor explicit hour tags, related themes, and Office metadata. A hymn outside a concrete current season is penalized, and hymns already completed on that local date are strongly avoided when a suitable unused hymn exists.

When a request explicitly selects a feast, category, or season, the engine first finds the strongest matching tier and then applies the strategy to its candidates. `random` chooses from the available candidates; `sequential` cycles through them while the engine process is running; `fixed` uses `fixedAssetId` (or the first candidate if no fixed ID is supplied). A seeded random choice is stable for the same date, seed, and request.

```json
{
  "date": "2026-08-15",
  "useLitCal": true,
  "calendar": "general",
  "strategy": "random",
  "canonicalHours": ["vespers"]
}
```

`POST /api/hymns/reset-day` accepts an optional date:

```json
{ "date": "2026-08-15" }
```

Omit `date` to clear the server’s current local date. This is useful for testing a schedule again; it deliberately removes that day’s completed-hymn history.

## Schedules

The public schedule format is returned by `GET /api/schedule` and accepted by `PUT /api/schedule`. `GET` and `PUT /api/schedule/simple` are equivalent aliases. The engine persists the schedule in SQLite.

```json
{
  "enabled": true,
  "westminster": {
    "enabled": true,
    "cadence": "hourly",
    "weekdays": ["sun", "mon", "tue", "wed", "thu", "fri", "sat"],
    "notBefore": "08:00",
    "notAfter": "20:00",
    "volume": 25,
    "mediaPlayers": ["media_player.kitchen"],
    "outputs": []
  },
  "routines": [
    {
      "id": "angelus",
      "name": "Angelus",
      "enabled": true,
      "type": "asset",
      "asset": "angelus",
      "times": ["12:00", "18:00"],
      "weekdays": ["sun", "mon", "tue", "wed", "thu", "fri", "sat"],
      "mediaPlayers": ["media_player.kitchen"],
      "outputs": []
    },
    {
      "id": "evening-hymn",
      "name": "Evening hymn",
      "enabled": true,
      "type": "liturgical_hymn",
      "canonicalHour": "vespers",
      "times": ["19:30"],
      "weekdays": ["sun", "mon", "tue", "wed", "thu", "fri", "sat"],
      "mediaPlayers": ["media_player.kitchen"],
      "outputs": []
    }
  ],
  "litcal": { "calendar": "general" }
}
```

### Global and Westminster fields

- `enabled` is the master schedule switch. When `false`, no Westminster or routine playback is due.
- `litcal.calendar` is the LitCal calendar used by every `liturgical_hymn` routine: `general`, `US`, `IT`, `NL`, `VA`, or `CA`. Automatic routines always evaluate the date through LitCal.
- `westminster.enabled` controls Westminster independently of the master switch.
- `westminster.cadence` is `every_15`, `every_30`, or `hourly`. The hourly chime is always included; the cadence controls the additional quarter chimes.
- `westminster.weekdays` is a non-empty list of `sun`, `mon`, `tue`, `wed`, `thu`, `fri`, and `sat`.
- `notBefore` and `notAfter` are optional inclusive `HH:MM` bounds. If the range crosses midnight, the early-morning part belongs to the preceding configured day. For example, a Monday `22:00`–`06:00` window includes Tuesday at `05:00`.
- `volume` is optional and must be 0–100. In a Home Assistant run, it sets player volume before playback and does not restore it afterward.

### Routine fields

Every routine needs `id`, `name`, `enabled`, a non-empty `times` array of `HH:MM` strings, and a non-empty `weekdays` array. Its `type` is one of:

| Type              | Required field | Behavior                                                                |
| ----------------- | -------------- | ----------------------------------------------------------------------- |
| `asset`           | `asset`        | Plays one exact asset. Use `asset: "angelus"` for the Angelus.          |
| `hymn_category`   | `categoryIds`  | Selects a hymn from the listed categories. `canonicalHour` is optional. |
| `liturgical_hymn` | —              | Uses the current LitCal context. `canonicalHour` is optional.           |

`mediaPlayers` contains Home Assistant entity IDs. `outputs` contains native output IDs or names returned by `/api/devices`. A Home Assistant runner handles routines with `mediaPlayers`; the engine’s native timer handles routines with `outputs`, or routines with neither target list by using the platform default output. If you provide both, both delivery paths can play the same due event.

The Home Assistant configuration form writes this public format. The server also reads an older internal action format for migration, but new clients should not use it.

### Running a schedule

| Endpoint                      | Purpose                                                                                                                                        |
| ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `POST /api/schedule/claim`    | Used by Home Assistant. Submit `{ "at": "<ISO timestamp>" }` to claim the due Home Assistant-targeted actions once for that schedule revision. |
| `POST /api/schedule/complete` | Used by Home Assistant after delivery. Submit `{ "slotKey": "...", "status": "completed" }` or `"failed"`, with optional `message`.            |
| `POST /api/schedule/run`      | Evaluates due native-output actions immediately. Accepts optional ISO `at` and optional `output` ID or name.                                   |

The running server evaluates native-output schedules every five seconds. A request to `/api/schedule/run` with no `output` uses the routine’s `outputs`; when those are empty it uses the platform default output. The normal Home Assistant path should use the integration, not `claim` and `complete` by hand.

## Direct playback

`POST /api/play` renders an asset and starts native local playback:

```json
{
  "asset": "test-bell",
  "output": "optional output ID or name",
  "distance": "half-mile"
}
```

`distance` is one of `near`, `church-grounds`, `quarter-mile`, `half-mile`, `one-mile`, or `custom`. For `custom`, add `customDistance` with any of `gain`, `highCutHz`, `attackGain`, `reflectionMix`, `reflectionDelays`, `reflectionGains`, or `stereoSpread`.

On success, the endpoint returns `{ ok, filePath, command }`. Invalid request bodies return `400`; unknown assets or unavailable native playback return `503` and are recorded in the event history.

`POST /api/stop` stops active direct playback and returns `{ "ok": true }`.

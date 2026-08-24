# HTTP API

The server defaults to `http://127.0.0.1:9876`. CORS is enabled for local Home Assistant/dashboard use.

If `VIRTUAL_CARILLON_API_TOKEN` is set, every `/api/*` endpoint requires an `Authorization: Bearer <token>` header. `GET /health` remains unauthenticated for Docker and reverse-proxy health checks.

Home Assistant is the product frontend: it owns schedules, conditions, action order, delays, and media-player targets. The API is the rendering, metadata, and native playback surface used by the integration and by CLI/special-case clients.

## Health and devices

- `GET /health` returns `{ ok, service, platform, arch, node, hostname }`.
- `GET /api/status` returns the default distance profile, outputs, Bluetooth diagnostics, and recent events.
- `GET /api/devices` returns outputs and Bluetooth diagnostics without event history.

## Assets and audio

- `GET /api/assets` returns built-in and imported assets with type/source/tags/provenance and, where supplied, `liturgicalTags` metadata.
- `GET /api/assets/:asset/audio` renders/caches and returns a WAV file.
- `POST /api/assets/import` registers a local recording. JSON requires `name` and `sourcePath`; optional fields include `id`, `type`, `license`, `attribution`, `sourceUrl`, `tags`, `liturgicalSeasons`, `feastTypes`, and a stable-ID `liturgicalTags` object.
- `DELETE /api/assets/:asset` removes a user asset; bundled assets cannot be removed.

## LitCal and hymn selection

- `GET /api/liturgical/:date?calendar=general` returns the normalized LitCal day for `general`, `US`, `IT`, `NL`, `VA`, or `CA`.
- `GET /api/liturgical/:date/hymn?calendar=general` returns the day and automatic selection.
- `GET /api/hymns` lists hymns and their complete `liturgicalTags`. Filter with `feastIds`, `categoryIds`, `seasonIds`, `officeIds`, `canonicalHours`, or `tags`.
- `GET /api/hymns/:hymn` returns one hymn's metadata.
- `POST /api/hymns/select` accepts `date`, `useLitCal`, `calendar`, `seasons`, `rank`, `feastIds`, `categoryIds`, `offices`, `canonicalHours`, `tags`, `strategy` (`random`, `sequential`, or `fixed`), `fixedAssetId`, `seed`, and `recentExclusion`.

Season, rank, and feast fields are LitCal conditions. When a condition does not match, the response contains no selected asset so Home Assistant can use the configured fallback action. When `useLitCal` is false, selection uses a neutral general day. Automatic selection uses the highest-priority celebration and exact-feast → category → season → General fallback. Seeded random selection is reproducible; unseeded random selection avoids the recent window when alternatives exist.

## Native playback

The HA path uses Home Assistant's media source and `media_player.play_media`; Home Assistant chooses and controls the speakers. The direct endpoints remain available for CLI and native host-output experiments.

`POST /api/play`

```json
{ "asset": "test-bell", "output": "optional output id or name", "distance": "half-mile" }
```

`distance` accepts `near`, `church-grounds`, `quarter-mile`, `half-mile`, `one-mile`, or `custom`. A custom request may include partial `customDistance` settings such as `highCutHz`, `gain`, `attackGain`, `reflectionMix`, `reflectionDelays`, `reflectionGains`, and `stereoSpread`.

Returns `{ ok, filePath, command }` on success. Invalid request bodies return `400`; unknown assets or unavailable playback return `503` and are recorded in the event table.

`POST /api/stop` stops tracked active playback and returns `{ ok: true }`.

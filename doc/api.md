# HTTP API

The server defaults to `http://127.0.0.1:9876`. CORS is enabled for local Home Assistant/dashboard use.

If `VIRTUAL_CARILLON_API_TOKEN` is set, every `/api/*` endpoint requires an `Authorization: Bearer <token>` header. `GET /health` remains unauthenticated for Docker and reverse-proxy health checks.

Home Assistant is the friendly frontend and media-player adapter, not a requirement. The public API uses the product vocabulary—Westminster, assets such as Angelus, and Liturgical Hymn—while the Node service keeps its internal action graph private. HA sends due assets to selected media players; API-only clients can target native device outputs instead.

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
- `GET /api/hymns` lists hymns and their complete `liturgicalTags`. Filter with `feastIds`, `categoryIds`, `seasonIds`, `officeIds`, or `canonicalHours`. `canonicalHours` is an explicit filter; schedule clock times do not implicitly become Liturgy-of-the-Hours labels.
- `GET /api/hymns/:hymn` returns one hymn's metadata.
- `POST /api/hymns/select` accepts `date`, `useLitCal`, `calendar`, `seasons`, `rank`, `feastIds`, `categoryIds`, `offices`, `canonicalHours`, `strategy` (`random`, `sequential`, or `fixed`), `fixedAssetId`, `seed`, and `recentExclusion`.
- `POST /api/hymns/reset-day` accepts `{ "date": "YYYY-MM-DD" }` (optional; defaults to the server's local liturgical date) and clears that date's completed-hymn history. This is useful for testing or replaying a day's schedule.

Season, rank, and feast fields are LitCal conditions. If LitCal is unavailable, selection uses a neutral general day so automatic mode still chooses the best available hymn. Automatic selection scores feast, saint/category, season, and canonical-hour matches; a requested canonical hour also gives a smaller thematic boost to suitable categories (for example, praise at Lauds and thanksgiving at Vespers) without assigning the hymn to that hour. Hymns already played on the same local schedule date are strongly penalized. Seeded random selection is reproducible; unseeded random selection randomizes equal-score ties.

### Canonical-hour thematic scoring

The thematic boost uses one primary theme per hour. These are selection heuristics derived from the Roman General Instruction; they are not official canonical-hour designations and never add an hour tag to a hymn.

| Hour | Primary theme | Basis |
| --- | --- | --- |
| Matins / Office of Readings | `contemplative` | Extended meditation on Scripture and spiritual writers (GILH 55–57). |
| Lauds | `praise` | Morning prayer recalls the Resurrection, and its psalmody traditionally includes a psalm of praise (GILH 38, 43). |
| Daytime Prayer | `passion` | Terce, Sext, and None commemorate the Lord’s Passion and the first preaching of the Gospel (GILH 74–75). |
| Vespers | `thanksgiving` | Evening Prayer gives thanks for the day and its evening sacrifice (GILH 39). Praise remains part of Vespers’ character but is not a second scoring theme. |
| Compline | `confidence` | Its psalmody is selected to evoke confidence in God (GILH 84, 88). |

Metadata additions are intentionally sparse: `Exsultet Caelum Laudibus` is tagged `praise` from its praise-focused office hymn text; `O God Beyond All Praising` is tagged `thanksgiving`, consistent with its documented “Praise and Thanksgiving” subject classification; and `Te lucis ante terminum` is tagged `confidence` because its Compline text entrusts the night to God’s guarding care. Existing feast and explicit canonical-hour metadata remains higher priority.

Sources: [General Instruction of the Liturgy of the Hours](https://www.liturgyoffice.org.uk/Resources//Rites/GILH.pdf), [Vatican II, *Sacrosanctum Concilium* §§89–90](https://www.vatican.va/content/vatican/en/archives/councils/ii_vatican_council/documents/vat-ii_const_19631204_sacrosanctum-concilium.html), [Divinum Officium: *Te lucis ante terminum*](https://www.divinumofficium.com/cgi-bin/horas/Pofficium.pl?command=prayCompletorium&date1=1-21-2026&lang2=Latin-gabc&version=Rubrics+1960+-+2020+USA&votive=C7b), and [Hymnary: *O God beyond all praising*](https://www.hymnary.org/text/o_god_beyond_all_praising_we_worship_you).

### Liturgical metadata contract

The `liturgical` object on a built-in hymn is intentionally closed and compile-time checked. Its fields accept only the finite taxonomy exported from `src/liturgical/taxonomy.ts`: `categories` use `LiturgicalCategoryId`, `seasons` use the known season IDs or their existing display names, `offices` use the five supported office IDs or display names, and `feasts`/`solemnities` use `LiturgicalFeastId`. Do not add free-form strings; add a value to the central taxonomy first, with a label and the corresponding matching logic where needed. Saint identities remain dynamic because LitCal does not expose a finite project-wide saint-ID taxonomy.

## Schedules

- `GET /api/schedule` returns the simple persisted configuration and its `updatedAt` value. `/api/schedule/simple` is an equivalent explicit alias.
- `PUT /api/schedule` stores the simple configuration below. `/api/schedule/simple` is an equivalent explicit alias. The server also accepts the older internal action format for migration, but new clients should use this public form:

```json
{
  "enabled": true,
  "westminster": {
    "enabled": true,
    "cadence": "every_15",
    "weekdays": ["sun", "mon", "tue", "wed", "thu", "fri", "sat"],
    "notBefore": "07:00",
    "notAfter": "22:00",
    "mediaPlayers": [],
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
      "weekdays": ["mon", "wed"],
      "volume": 100,
      "mediaPlayers": [],
      "outputs": []
    },
    {
      "id": "seasonal-hymn",
      "name": "Seasonal hymn",
      "enabled": true,
      "type": "liturgical_hymn",
      "times": ["15:00"],
      "weekdays": ["sun", "mon", "tue", "wed", "thu", "fri", "sat"],
      "notBefore": "09:00",
      "notAfter": "21:00",
      "mediaPlayers": [],
      "outputs": []
    }
  ],
  "litcal": { "enabled": true, "calendar": "general" }
}
```

`westminster.cadence` is `every_15`, `every_30`, or `hourly`; the server chooses the correct quarter asset and actual 1–12 hour-strike asset. A routine's `type` is `asset`, `liturgical_hymn`, or `hymn_category`; use `asset: "angelus"` for the Angelus. A `hymn_category` routine may include `categoryIds` and optionally `canonicalHour` to choose a hymn from that collection. `times` accepts any number of exact `HH:MM` values. An optional `volume` sets the routine's Home Assistant media-player volume percentage from 0 to 100; when omitted, the current player volume is left unchanged. `weekdays`, `notBefore`, and `notAfter` apply to every listed time, including overnight windows such as 22:00–06:00. A Liturgical Hymn can optionally include `canonicalHour` when the selection should prefer a particular Office hour. `mediaPlayers` are Home Assistant entity IDs; `outputs` are native device IDs or names from `/api/devices`.
- `POST /api/schedule/claim` accepts `{ "at": "<ISO timestamp>" }`, evaluates all routines due at that local date/time, and atomically claims the resulting playback sequence for the current schedule revision.
- `POST /api/schedule/complete` accepts `{ "slotKey": "...", "status": "completed|failed" }` so the HA runner can record the result.
- `POST /api/schedule/run` accepts `{ "at": "<ISO timestamp>", "output": "optional native output id or name" }`, evaluates the same schedule, and immediately renders/plays due events through native device output. If `output` is omitted, each routine's `outputs` are used; with no native targets, the platform default is used. This is also the API-only smoke-test/trigger path and does not require Home Assistant.

The default schedule is disabled with no routines. No household-specific Westminster, Angelus, or hymn timetable is built into the default configuration. When native targets are configured—or when a routine has neither HA nor native targets—the running server checks the schedule every five seconds and plays due events itself. HA-targeted routines use `/api/schedule/claim` and the integration's media-player handoff.

## Native playback

The HA path uses Home Assistant's media source and `media_player.play_media`; Home Assistant chooses and controls the speakers. The direct endpoints remain available for CLI and native host-output experiments.

`POST /api/play`

```json
{ "asset": "test-bell", "output": "optional output id or name", "distance": "half-mile" }
```

`distance` accepts `near`, `church-grounds`, `quarter-mile`, `half-mile`, `one-mile`, or `custom`. A custom request may include partial `customDistance` settings such as `highCutHz`, `gain`, `attackGain`, `reflectionMix`, `reflectionDelays`, `reflectionGains`, and `stereoSpread`.

`GET /api/assets/:asset/audio?distance=<profile>` accepts the same non-custom profiles and renders the asset using that profile. Without the query parameter, rendering defaults to `half-mile`.

Returns `{ ok, filePath, command }` on success. Invalid request bodies return `400`; unknown assets or unavailable playback return `503` and are recorded in the event table.

`POST /api/stop` stops tracked active playback and returns `{ ok: true }`.

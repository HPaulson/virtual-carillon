# Architecture

This page is for contributors who need to understand the project boundary. User setup belongs in the [main guide](../README.md) and [Home Assistant guide](home-assistant.md).

## Runtime roles

The Node engine owns bell synthesis, asset rendering, the HTTP API, persistent schedules, schedule claims, event history, user recordings, and LitCal cache files. Home Assistant is optional: the integration supplies forms, media browsing, and speaker delivery, but it does not render the audio.

```text
Home Assistant integration ── schedule/settings ──► Node API + SQLite
          │                                               │
          │◄────────── due Home Assistant actions ────────┤
          ▼                                               ▼
  Home Assistant media players                    native local outputs
```

The standard Home Assistant path is deliberately speaker-agnostic. The integration turns a rendered asset into a Home Assistant media-source URL and calls `media_player.play_media`; the engine does not pair, discover, or configure those speakers.

## Main modules

| Path                                          | Responsibility                                                                                         |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `engine/src/cli/`                             | Command-line entry point, hymn-cycle commands, and automatic-selection preview.                        |
| `engine/src/configuration/`                   | Environment settings and default data paths.                                                           |
| `engine/src/api/`                             | Fastify HTTP API, authentication, direct playback, and schedule handoff.                               |
| `engine/src/scheduling/`                      | Schedule validation, normalization, time windows, Westminster matching, and target rules.              |
| `engine/src/database/`                        | SQLite storage for schedules, claims, events, and completed-hymn history.                              |
| `engine/src/audio/` and `engine/src/bells/`   | Bell synthesis, WAV rendering, distance profiles, local-output discovery, and native playback.         |
| `engine/src/library/`                         | Bundled assets, imported recordings, hymn catalog, metadata, rendering, and playback.                  |
| `engine/src/liturgical/`                      | LitCal retrieval and caching, calendar normalization, taxonomy, conditions, and hymn-query conversion. |
| `engine/tests/`                               | Automated tests for the engine’s API, audio, library, liturgical, notation, and scheduling behavior.   |
| `homeassistant/integration/virtual_carillon/` | Home Assistant config flow, coordinator, schedule runner, media source, services, and status sensor.   |
| `homeassistant/app/`                          | Supervisor app definition and entrypoint.                                                              |

## Data directory

The configured data directory contains the persistent state:

| Path              | Contents                                                                                                                               |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `carillon.sqlite` | Saved schedules, claimed runs, event history, and completed-hymn history.                                                              |
| `cache/`          | Lazily rendered WAV files. Safe to regenerate.                                                                                         |
| `assets/`         | Imported recordings and their `index.json` library manifest.                                                                           |
| `litcal/`         | Cached normalized LitCal calendar years. Stale cached data is preferred to blocking playback when the calendar service is unavailable. |

Back up the database and `assets/` when preserving saved configuration and imported content matters. Rendered audio can be recreated.

## Schedule delivery

The public schedule format uses Westminster, assets, and hymn modes. The internal action graph supports the execution details and legacy migration, but new integrations should use `GET` and `PUT /api/schedule`.

- A routine with `mediaPlayers` is claimed by the Home Assistant integration and delivered through `media_player` entities.
- A routine with native `outputs`, or with neither target list, is evaluated by the server’s native schedule timer.
- A routine that names both can use both delivery paths. This is intentional API-level behavior, but normal Home Assistant routines supply media players only.
- Schedule claims use the local date and minute plus the schedule revision, so the same Home Assistant event is not claimed twice after a restart or repeated tick.

## Hymn selection

The hymn catalog is independent of rendering. Hymn definitions declare metadata; date and calendar logic live in the LitCal and catalog layers.

```text
date + calendar
      │
      ▼
LitCal day ──► celebration / season tags ──► hymn catalog ──► selected asset
                                                     │
                                      daily completed-hymn history
```

Automatic selection scores feast, saint, category, season, and optional canonical-hour preference. Explicit category, season, and feast queries use a tiered match instead. The full external contract is in the [API reference](api.md#litcal-and-hymn-selection).

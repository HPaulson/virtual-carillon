# Architecture

## System boundary

The Node service owns bell synthesis, asset rendering, audio serving, persistence of playback events, and diagnostics. Home Assistant is the frontend: it owns scheduling, LitCal settings, media-player targeting, and playback actions. Home Assistant does not contain audio/DSP logic.

```text
Home Assistant config flow, automations, media players
                         │ HTTP / media source
                         ▼
                   Fastify API
                         │
              ┌──────────┼──────────┐
              ▼          ▼          ▼
           Library    Catalog    LitCal client
              │          │          │
              ▼          ▼          ▼
           WAV cache  selection   cached years
                         │
                         ▼
                 HA media_player targets
```

## Source map

- `src/cli/index.ts` — CLI entry point and process composition for development/special cases.
- `src/configuration/config.ts` — deployment environment parsing with Zod.
- `src/database/db.ts` — SQLite event history using `node:sqlite`.
- `src/bells/` — inharmonic partials, distance profiles, and bell-family definitions.
- `src/audio/` — synthesis, WAV writing, output discovery, and playback.
- `src/library/library.ts` — built-in and imported asset definitions, rendering, and playback.
- `src/library/catalog.ts` — stable-ID liturgical queries, priority matching, and selection strategies.
- `src/api/server.ts` — Fastify routes consumed by Home Assistant and explicit CLI/special-case clients.
- `src/liturgical/litcal.ts` — cached LitCal client; stale data is used when the network is unavailable.
- `src/liturgical/resolver.ts` — LitCal condition matching and conversion to catalog queries.
- `src/liturgical/taxonomy.ts` — stable seasons, feast/category IDs, tagging, and LitCal inference.
- `homeassistant/custom_components/virtual_carillon/` — HA config flow/options, coordinator, media source, sensor, and target-based services.
- `homeassistant/blueprints/` — an optional HA automation blueprint for reusable scheduled routines.

## Runtime data

The configured data directory contains `carillon.sqlite` for playback events, `cache/*.wav` for lazily rendered audio, and cached LitCal years. Caches can be regenerated; keep the event database if its history matters.

## Audio flow

1. `AssetLibrary` validates an asset ID.
2. A bell or sequence is rendered into a cached WAV file if needed.
3. The engine serves the rendered audio through `/api/assets/:id/audio`.
4. The Home Assistant integration exposes the asset through its media source and proxies the audio URL through Home Assistant.
5. Home Assistant sends the media URL to the selected `media_player` entity or entities. The Node container does not need access to the speaker.

The CLI and `/api/play` path support native host-output experiments and special cases. They are not required by the Home Assistant deployment.

## Liturgical selection flow

```text
HA LitCal option → API request → LitCal day → primary celebration by grade
               → LiturgicalTags → HymnQuery → selection strategy
               → AssetLibrary renderer → HA media_player target
```

The catalog owns matching and selection state. Hymn definitions only declare metadata; they do not contain date or feast branches. If LitCal is disabled in the HA options flow, the API selects against a neutral general day. If LitCal is unavailable, the HA service can play its configured fallback asset.

# Architecture

## System boundary

The Node engine owns bell synthesis, asset rendering, playback, scheduling, persistence, and diagnostics. Home Assistant is a client of the engine through HTTP. It should not contain audio/DSP logic.

```text
Home Assistant custom component
            │ HTTP
            ▼
      Fastify API
            │
  ┌─────────┼─────────┐
  ▼         ▼         ▼
Library  Catalog  Scheduler / Devices
  │         │         │
  ▼         ▼         ▼
WAV cache SQLite   PipeWire/Bluetooth
```

## Source map

- `src/cli/index.ts` — CLI entry point and process composition.
- `src/configuration/config.ts` — environment parsing with Zod.
- `src/database/db.ts` — SQLite schema and schedule/event persistence using `node:sqlite`.
- `src/bells/types.ts` — inharmonic partials, distance profiles, and bell-family definitions.
- `src/bells/instrument.ts` — the 77-bell C1–E7 note-addressable grand-carillon registry; each bell has its own modal profile, loudness, attack, and tail.
- `src/bells/synth.ts` — modal two-mode bell synthesis and far-field air/early-reflection model. It does not use a feedback cathedral reverb.
- `src/audio/wav.ts` — PCM16 stereo WAV writer.
- `src/audio/engine.ts` — polyphonic event mixing, waveform reuse, cache/play orchestration, and tail-safe mastering.
- `src/audio/outputs.ts` — PipeWire/PulseAudio/CoreAudio discovery, Bluetooth diagnostics, and player selection.
- `src/library/library.ts` — built-in bell and sequence asset definitions and asset validation.
- `src/library/hymns.ts` — compatibility barrel for the structured hymn registry.
- `src/library/hymns/` — one self-contained hymn definition per file, shared tune notation, `defineHymn()`, and the notation-to-ABC serializer.
- `src/library/catalog.ts` — reusable stable-ID liturgical queries, priority matching, and random/sequential/fixed selection.
- `src/scheduler/` — schedule types and minute-level scheduler.
- `src/api/server.ts` — Fastify routes consumed by Home Assistant and other clients.
- `src/melodies/types.ts` — beat-based score/events, pitch utilities, ties, meter, and provenance metadata.
- `src/melodies/parsers.ts` — ABC, MIDI, MusicXML, and GABC import primitives; bundled hymns use the structured-notation → ABC → `parseAbc()` path.
- `src/melodies/arranger.ts` — whole-piece transposition, carillon register diagnostics, and style-aware melody/chord/bass/inner-voice arrangement with phrase cadences and passing tones.
- `src/liturgical/litcal.ts` — optional cached LitCal client; stale cache keeps operation offline.
- `src/liturgical/resolver.ts` — schedule condition compatibility and delegation to the hymn catalog.
- `src/liturgical/taxonomy.ts` — stable seasons, feast/category IDs, tagging, and LitCal inference.
- `homeassistant/custom_components/virtual_carillon/` — Home Assistant config flow, coordinator, media player, sensor, and services.

## Runtime data

The configured data directory contains `carillon.sqlite` for schedules/events and `cache/*.wav` for lazily rendered audio. The cache can be regenerated; the SQLite database contains user schedule state and should be backed up.

## Content model

`AudioAsset` exposes `type` (`recording`, `bell`, `sequence`, `melody`, or `hymn`) and `source` (`bundled`, `user`, or `generated`). Fixed traditional signals retain source URLs and descriptions. A tower bell, clock chime, clock-tower hour bell, monastery bell, and carillon are separate generated instruments. User recordings live under the configured data directory and are indexed by `assets/index.json`.

## Audio flow

1. `AssetLibrary` validates an asset ID.
2. A bell or sequence is rendered into a cached WAV file if needed.
3. Outputs are discovered at playback time.
4. Linux prefers `pw-play`, then `paplay`, then `ffplay`; macOS development uses `afplay`.
5. Child-process PIDs are tracked so `stop` can terminate active playback.

Do not move output discovery into the scheduler. The scheduler only knows asset IDs and optional output IDs/names.

## Liturgical selection flow

```text
LitCal day → primary celebration by actual grade → LiturgicalTags
          → HymnQuery → exact feast/category/season matching
          → random | sequential | fixed strategy → AssetLibrary renderer → output
```

The catalog owns matching and selection state. Hymn definitions only declare metadata; they do not contain date or feast branches. The calendar remains optional and schedule failures fall back to the configured asset.

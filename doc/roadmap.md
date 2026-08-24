# Roadmap and Known Gaps

The current implementation is a usable MVP, not the complete long-term product described in the original build specification.

## Implemented now

- A 77-bell C1–E7 note-addressable carillon registry with individual inharmonic modal profiles, register-dependent attack/decay/loudness, and a near-to-one-mile outdoor distance model.
- Polyphonic beat-based score rendering with independent melody, harmony, bass, and natural bell tails.
- WAV cache and a typed library of bells, signals, traditional sequences, hymns, and user recordings.
- Source-backed Westminster quarter/half/three-quarter/hour patterns, Angelus variants, and configurable Divine Office signals.
- Public-domain/traditional hymn metadata, sourced GABC chant imports, carillon arranging/register diagnostics, ABC/MIDI/MusicXML import primitives, and cached LitCal selection controlled by Home Assistant.
- PipeWire/PulseAudio discovery and generic Bluetooth sink diagnostics.
- CLI, Fastify API, SQLite event history, Docker deployment, and Home Assistant custom component.

## Important gaps

- Bluetooth reconnect and fallback-speaker policy are not fully implemented; playback errors are isolated but reconnection is host/manual.
- User-uploaded MIDI/MusicXML files are parser-ready but are not yet exposed as a file-upload endpoint; recordings are imported through the CLI/API path.
- No third-party recording is bundled until redistribution rights are verified; hardware-specific authenticity still benefits from user-imported local recordings.
- Westminster and any number of simple asset/Liturgical Hymn schedules are integration-configured and server-owned; HA automations and the blueprint remain advanced override paths.
- The generated bell timbres remain a procedural model rather than recordings of a particular foundry; user-imported licensed recordings can still provide hardware-specific authenticity.
- Westminster absolute tuning varies by installation; the project uses the documented E–D–C–G phrase in a clock-bell family and keeps its source attribution explicit.
- Linux PipeWire/Bluetooth behavior requires hardware/session validation; macOS tests use CoreAudio fallback.
- Home Assistant metadata currently uses placeholder documentation/issue URLs in `manifest.json`; replace them before publishing to HACS.

## Suggested next increments

1. Add more API-level tests with Fastify `inject` for playback errors and audio download.
2. Add multipart user upload and notation-file import with format-aware playback/conversion through FFmpeg.
3. Introduce explicit output groups, fallback outputs, and a reconnect worker while keeping scheduling in Home Assistant.
4. Add richer Home Assistant blueprint presets for quiet hours and recurring routines.
5. Add HACS metadata, release/versioning, and Home Assistant integration tests.
6. Test end to end on a Linux host with PipeWire and an Echo Show or another Bluetooth sink.

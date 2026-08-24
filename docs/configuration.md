# Configuration

The Node service is configured with environment variables for deployment concerns only. Scheduling, media-player targets, and LitCal settings belong to Home Assistant.

| Variable | Default | Purpose |
| --- | --- | --- |
| `VIRTUAL_CARILLON_DATA_DIR` | `.data` | SQLite event history and rendered audio cache |
| `VIRTUAL_CARILLON_HOST` | `127.0.0.1` | HTTP bind address |
| `VIRTUAL_CARILLON_PORT` | `9876` | Home Assistant API port |
| `VIRTUAL_CARILLON_API_TOKEN` | unset | Bearer token required for `/api/*`; set this before exposing a domain |
| `VIRTUAL_CARILLON_SAMPLE_RATE` | `44100` | WAV sample rate; `44100` or `48000` |
| `VIRTUAL_CARILLON_DISTANCE_PROFILE` | `half-mile` | Outdoor listener model |

Configure LitCal and the schedule in the Virtual Carillon integration's Options flow in Home Assistant, or save the same simple schedule through `PUT /api/schedule`. Enable Westminster with its cadence, days, and time window, then add any number of asset or Liturgical Hymn schedules with multiple exact times and selected days. Use Home Assistant `mediaPlayers` when HA should choose speakers, or leave them empty for native output/API-only playback. The schedule is persisted by the Node service in SQLite.

# Configuration

The Node service is configured with environment variables for deployment concerns only. Scheduling, media-player targets, and LitCal settings belong to Home Assistant.

| Variable                       | Default     | Purpose                                                                        |
| ------------------------------ | ----------- | ------------------------------------------------------------------------------ |
| `VIRTUAL_CARILLON_DATA_DIR`    | `.data`     | SQLite event history and rendered audio cache                                  |
| `VIRTUAL_CARILLON_HOST`        | `127.0.0.1` | HTTP bind address                                                              |
| `VIRTUAL_CARILLON_PORT`        | `9876`      | Home Assistant API port                                                        |
| `VIRTUAL_CARILLON_API_TOKEN`   | unset       | Bearer token required by Docker Compose for `/api/*`; required for deployments |
| `VIRTUAL_CARILLON_SAMPLE_RATE` | `44100`     | WAV sample rate; `44100` or `48000`                                            |

Configure LitCal and the schedule in the Virtual Carillon integration's Options flow in Home Assistant, or save the same simple schedule through `PUT /api/schedule`. Enable Westminster with its cadence, days, and time window, then add any number of asset or Liturgical Hymn schedules with multiple exact times and selected days. Use Home Assistant `mediaPlayers` when HA should choose speakers, or leave them empty for native output/API-only playback. The schedule is persisted by the Node service in SQLite.

Configure the Home Assistant playback distance profile under the integration's General settings. The Node engine and CLI default to `half-mile`; CLI/API per-play overrides remain available.
